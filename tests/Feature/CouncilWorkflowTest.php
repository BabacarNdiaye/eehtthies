<?php

namespace Tests\Feature;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Services\Council\CouncilRoster;
use App\Services\Council\CouncilWorkflow;
use App\Services\Council\SnapshotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Cycle de vie d'un conseil (§3.1) : création en brouillon, programmation (photo prise), annulation, rafraîchissement de
 * la photo, appel, ouverture de séance (photo figée). Les transitions de fin (délibération, PV, clôture) ont leurs tests.
 */
class CouncilWorkflowTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
    }

    private function workflow(): CouncilWorkflow
    {
        return app(CouncilWorkflow::class);
    }

    private function assertRefused(string $code, callable $action): void
    {
        try {
            $action();
        } catch (CouncilException $exception) {
            $this->assertSame($code, $exception->errorCode, $exception->getMessage());

            return;
        }

        $this->fail("La règle {$code} aurait dû refuser l'action.");
    }

    private function callRoll(Council $council): void
    {
        $council->members()->get()->each(fn (CouncilMember $member) => $member->update(['attendance' => 'present']));
    }

    public function test_a_council_starts_as_a_draft_with_its_members_and_students(): void
    {
        $cuisine = $this->subject('Cuisine', 3);
        [$teacherUser] = $this->teacher('Moussa', [$cuisine]);
        $this->pupil('Awa');
        $this->pupil('Fatou');
        $gone = $this->pupil('Parti');
        $gone->update(['status' => 'abandon']);

        $council = $this->makeCouncil([], [['user_id' => $teacherUser->id, 'function' => 'teacher'], ['external_name' => 'Aïda Ndiaye', 'external_role' => 'Déléguée des parents', 'function' => 'delegate_parent', 'can_vote' => false]]);

        $this->assertSame(Council::DRAFT, $council->status);
        $this->assertSame(2, $council->students()->count(), 'CRE-04 : les élèves actifs de la classe.');
        $functions = $council->members()->pluck('function')->all();
        $this->assertContains('president', $functions);
        $this->assertContains('main_teacher', $functions);
        $this->assertContains('teacher', $functions);
        $this->assertContains('delegate_parent', $functions);
        $this->assertSame('Aïda Ndiaye', $council->members()->where('function', 'delegate_parent')->first()->display_name);
    }

    public function test_the_proposed_members_are_the_teachers_of_the_class_and_school_life(): void
    {
        $cuisine = $this->subject('Cuisine');
        [, $teacher] = $this->teacher('Moussa', [$cuisine]);
        $agent = $this->staff('vie-scolaire', 'Agent Vie Scolaire');

        $proposed = app(CouncilRoster::class)->proposeMembers($this->class);

        $this->assertContains($teacher->id, array_column($proposed, 'teacher_id'));
        $this->assertContains($agent->id, array_column($proposed, 'user_id'));
        $this->assertSame('school_life', collect($proposed)->firstWhere('user_id', $agent->id)['function']);
    }

    public function test_a_designated_person_appears_once_with_their_council_function(): void
    {
        $direction = $this->staff('direction');

        $council = $this->makeCouncil(['president_id' => $direction->id], [['user_id' => $direction->id, 'function' => 'teacher']], $direction);

        $this->assertSame(1, $council->members()->where('user_id', $direction->id)->count());
        $this->assertSame('president', $council->members()->where('user_id', $direction->id)->value('function'));
    }

    public function test_two_councils_for_the_same_class_and_term_are_refused(): void
    {
        $this->makeCouncil();

        $this->assertRefused('COUNCIL_DUPLICATE', fn () => $this->makeCouncil());
        $this->assertSame(1, Council::count());

        $this->makeCouncil(['term' => 'Semestre 2']);
        $this->assertSame(2, Council::count(), 'Une autre période reste possible.');
    }

    public function test_scheduling_requires_a_date_a_president_and_a_main_teacher(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil(['scheduled_at' => null, 'main_teacher_id' => null], [], $by);

        $this->assertRefused('COUNCIL_INCOMPLETE', fn () => $this->workflow()->schedule($council, $by));
        $this->assertSame(Council::DRAFT, $council->fresh()->status);
    }

    public function test_scheduling_takes_the_snapshot(): void
    {
        $student = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $student, 14);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);

        $this->workflow()->schedule($council, $by);

        $council->refresh();
        $this->assertSame(Council::SCHEDULED, $council->status);
        $this->assertNotNull($council->snapshot_taken_at);
        $this->assertSame(14.0, $council->students()->first()->general_average);
        $this->assertSame('green', $council->students()->first()->alert_level);
    }

    public function test_scheduling_can_be_cancelled_before_the_session(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);

        $this->workflow()->unschedule($council, $by);

        $this->assertSame(Council::DRAFT, $council->fresh()->status);
    }

    public function test_the_snapshot_can_be_refreshed_while_scheduled_only(): void
    {
        $student = $this->pupil('Awa');
        $exam = $this->exam($this->subject('Cuisine'));
        $this->grade($exam, $student, 8);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);

        $this->assertRefused('COUNCIL_WRONG_STATUS', fn () => $this->workflow()->refreshSnapshot($council, $by));

        $this->workflow()->schedule($council, $by);
        $this->grade($exam, $student, 16);
        $this->workflow()->refreshSnapshot($council, $by);

        $this->assertSame(16.0, $council->students()->first()->general_average, 'FIG-02 : la photo suit la note corrigée.');
        $this->assertTrue(Activity::where('log_name', 'conseils')->where('description', 'Photo des données rafraîchie')->exists());
    }

    public function test_the_session_cannot_start_before_the_planned_day(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);
        $this->callRoll($council);

        $this->assertRefused('COUNCIL_TOO_EARLY', fn () => $this->workflow()->start($council, $by, Carbon::parse('2026-11-19 18:00')));
        $this->assertSame(Council::SCHEDULED, $council->fresh()->status);
    }

    public function test_the_session_cannot_start_before_the_roll_call(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);

        $this->assertRefused('COUNCIL_ROLL_CALL', fn () => $this->workflow()->start($council, $by, Carbon::parse('2026-11-20 15:00')));
    }

    public function test_starting_the_session_freezes_the_snapshot(): void
    {
        $student = $this->pupil('Awa');
        $exam = $this->exam($this->subject('Cuisine'));
        $this->grade($exam, $student, 12);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);
        $this->callRoll($council);

        $this->workflow()->start($council, $by, Carbon::parse('2026-11-20 15:05'));

        $council->refresh();
        $this->assertSame(Council::IN_SESSION, $council->status);
        $this->assertSame('2026-11-20 15:05:00', $council->started_at->format('Y-m-d H:i:s'));

        // FIG-03 / RG-17 : une note modifiée après l'ouverture ne change plus rien.
        $this->grade($exam, $student, 2);
        app(SnapshotService::class)->take($council);
        $this->assertSame(12.0, $council->students()->first()->general_average);
        $this->assertRefused('COUNCIL_WRONG_STATUS', fn () => $this->workflow()->refreshSnapshot($council, $by));
    }

    public function test_a_student_who_left_the_class_stays_marked_as_left(): void
    {
        $awa = $this->pupil('Awa');
        $moussa = $this->pupil('Moussa');
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);

        $moussa->update(['status' => 'transfere']);
        $this->workflow()->refreshSnapshot($council, $by);

        $this->assertTrue($council->students()->where('student_id', $moussa->id)->value('has_left_class'), 'RG-21 : il reste au conseil, marqué « sorti ».');
        $this->assertFalse((bool) $council->students()->where('student_id', $awa->id)->value('has_left_class'));
        $this->assertSame(2, $council->students()->count());
    }

    public function test_the_roll_call_records_the_arrival_time(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);
        $member = $council->members()->where('function', 'main_teacher')->firstOrFail();

        $this->travelTo(Carbon::parse('2026-11-20 15:02'));
        $this->workflow()->recordAttendance($council, $member, 'present', $by);
        $this->assertSame('15:02', $member->fresh()->arrived_at->format('H:i'));

        $this->workflow()->recordAttendance($council, $member, 'excused', $by);
        $this->assertNull($member->fresh()->arrived_at);
        $this->assertRefused('COUNCIL_BAD_MEMBER', fn () => $this->workflow()->recordAttendance($council, $member, 'en_retard', $by));
    }

    public function test_every_transition_is_written_to_the_council_journal(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);
        $this->workflow()->unschedule($council, $by);

        $descriptions = Activity::where('log_name', 'conseils')->where('properties->council_id', $council->id)->orderBy('id')->pluck('description')->all();

        $this->assertContains('Conseil créé (brouillon)', $descriptions);
        $this->assertContains('Conseil programmé ; photo des données prise', $descriptions);
        $this->assertContains('Programmation annulée', $descriptions);
        $this->assertSame($by->id, Activity::where('description', 'Programmation annulée')->value('causer_id'));
    }

    public function test_frame_and_members_can_no_longer_change_once_the_session_started(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->workflow()->schedule($council, $by);
        $this->callRoll($council);
        $this->workflow()->start($council, $by, Carbon::parse('2026-11-20 15:00'));

        $this->assertRefused('COUNCIL_WRONG_STATUS', fn () => $this->workflow()->update($council, ['room' => 'Autre'] + $council->only(['academic_year_id', 'school_class_id', 'term']), [], $by));
    }
}

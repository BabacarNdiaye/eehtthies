<?php

namespace Tests\Feature;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilSitting;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\Council\CouncilMeetingService;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilSittingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Séance commune : les conseils de plusieurs classes tenus ensemble (même date, salle, président, visio), chacun gardant
 * sa photo, ses décisions et son procès-verbal. Membres communs + enseignants de chaque classe ; appel fait une fois.
 */
class CouncilSittingTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $direction;

    private User $secretary;

    private User $viesco;

    private SchoolClass $other;

    private User $profA;

    private User $profB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->other = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $this->pupil('Awa');
        $this->pupil('Moussa', 'Fall', $this->other);
        $this->direction = $this->staff('direction', 'Directrice');
        $this->secretary = $this->staff('secretariat', 'Secrétaire');
        $this->viesco = $this->staff('vie-scolaire', 'Vie Scolaire');
        $this->profA = $this->teacher('Alpha', [$this->subject('Cuisine')])[0];
        $this->profB = $this->teacher('Beta', [$this->subject('Service')], $this->other)[0];
    }

    private function sittings(): CouncilSittingService
    {
        return app(CouncilSittingService::class);
    }

    private function frame(array $overrides = []): array
    {
        return $overrides + [
            'academic_year_id' => $this->year->id, 'term' => 'Semestre 1', 'is_end_of_year' => false,
            'scheduled_at' => '2026-11-20 15:00:00', 'room' => 'Salle de conférence', 'agenda' => 'Bilan du semestre',
            'president_id' => $this->direction->id, 'secretary_id' => $this->secretary->id,
        ];
    }

    private function create(?array $classes = null): CouncilSitting
    {
        return $this->sittings()->create($this->frame(), $classes ?? [
            ['school_class_id' => $this->class->id, 'main_teacher_id' => $this->profA->id],
            ['school_class_id' => $this->other->id, 'main_teacher_id' => $this->profB->id],
        ], [['user_id' => $this->viesco->id, 'function' => 'school_life']], $this->direction);
    }

    private function member(Council $council, User $user): ?CouncilMember
    {
        return CouncilMember::where('council_id', $council->id)->where('user_id', $user->id)->first();
    }

    public function test_one_council_per_class_with_common_members_and_its_own_teachers(): void
    {
        $sitting = $this->create();
        [$a, $b] = [$sitting->councils()->where('school_class_id', $this->class->id)->firstOrFail(), $sitting->councils()->where('school_class_id', $this->other->id)->firstOrFail()];

        $this->assertSame(2, $sitting->councils()->count());
        foreach ([$a, $b] as $council) {
            $this->assertSame('Semestre 1', $council->term);
            $this->assertSame('Salle de conférence', $council->room);
            $this->assertSame($this->direction->id, $council->president_id);
            $this->assertNotNull($this->member($council, $this->viesco), 'Membre commun présent dans chaque conseil.');
            $this->assertNotNull($this->member($council, $this->secretary));
        }
        $this->assertSame($this->profA->id, $a->main_teacher_id);
        $this->assertNotNull($this->member($a, $this->profA));
        $this->assertNull($this->member($a, $this->profB), 'Un enseignant ne siège que pour ses classes.');
        $this->assertNotNull($this->member($b, $this->profB));
        $this->assertSame(1, $a->students()->count());
    }

    public function test_a_class_that_already_has_its_council_cancels_the_whole_sitting(): void
    {
        $this->makeCouncil([], [], $this->direction);

        try {
            $this->create();
            $this->fail('Le doublon aurait dû être refusé.');
        } catch (CouncilException $exception) {
            $this->assertSame('COUNCIL_DUPLICATE', $exception->errorCode);
            $this->assertStringContainsString('BTS1', $exception->getMessage());
        }
        $this->assertSame(0, CouncilSitting::count());
        $this->assertSame(1, Council::count());
    }

    public function test_scheduling_reports_each_class_that_is_not_ready(): void
    {
        $sitting = $this->create([
            ['school_class_id' => $this->class->id, 'main_teacher_id' => $this->profA->id],
            ['school_class_id' => $this->other->id, 'main_teacher_id' => null],
        ]);

        $result = $this->sittings()->scheduleAll($sitting, $this->direction);

        $this->assertSame(1, $result['done']);
        $this->assertArrayHasKey('BTS2', $result['errors']);
        $this->assertSame(Council::SCHEDULED, $sitting->councils()->where('school_class_id', $this->class->id)->value('status'));
    }

    public function test_the_roll_call_is_made_once_for_every_class(): void
    {
        $sitting = $this->create();
        $this->sittings()->scheduleAll($sitting, $this->direction);

        $roll = collect($this->sittings()->rollCall($sitting))->keyBy('user_id');
        $this->assertSame(['BTS1', 'BTS2'], $roll[$this->viesco->id]['classes']);
        $this->assertSame(['BTS1'], $roll[$this->profA->id]['classes']);

        $this->sittings()->recordAttendance($sitting, $this->viesco->id, 'present', $this->direction);
        foreach ($sitting->councils as $council) {
            $this->assertSame('present', $this->member($council, $this->viesco)->attendance);
        }
    }

    public function test_opening_starts_every_ready_class_and_the_session_screen_switches_between_them(): void
    {
        $sitting = $this->create();
        $this->sittings()->scheduleAll($sitting, $this->direction);
        foreach ($this->sittings()->rollCall($sitting) as $person) {
            $this->sittings()->recordAttendance($sitting, $person['user_id'], 'present', $this->direction);
        }

        $result = $this->sittings()->startAll($sitting->fresh(), $this->direction, now()->setDate(2026, 11, 20));
        $this->assertSame(2, $result['done']);

        $a = $sitting->councils()->where('school_class_id', $this->class->id)->firstOrFail();
        $this->actingAs($this->direction)->get(route('council.session.show', $a))->assertInertia(fn (Assert $page) => $page
            ->where('sitting.id', $sitting->id)
            ->has('sitting.councils', 2)
            ->where('sitting.councils.0.class', 'BTS1')
            ->where('sitting.councils.1.class', 'BTS2'));
    }

    public function test_the_visio_is_shared_by_every_class_of_the_sitting(): void
    {
        $sitting = $this->create();
        $this->sittings()->scheduleAll($sitting, $this->direction);
        foreach ($this->sittings()->rollCall($sitting) as $person) {
            $this->sittings()->recordAttendance($sitting, $person['user_id'], $person['user_id'] === $this->profB->id ? 'absent' : 'present', $this->direction);
        }
        $this->sittings()->startAll($sitting->fresh(), $this->direction, now()->setDate(2026, 11, 20));
        [$a, $b] = [$sitting->councils()->where('school_class_id', $this->class->id)->firstOrFail(), $sitting->councils()->where('school_class_id', $this->other->id)->firstOrFail()];

        $meeting = app(CouncilMeetingService::class)->start($a, $this->direction, 'video');
        $this->assertSame($meeting->id, app(CouncilMeetingService::class)->openFor($b)?->id, 'Une seule visio pour la séance.');

        // Le professeur de BTS2 rejoint depuis le conseil de sa classe : il est présent à distance pour BTS2.
        $this->actingAs($this->profB)->postJson(route('council.meeting.join', $b))->assertOk()->assertJsonCount(2, 'participants');
        $this->assertTrue($this->member($b->fresh(), $this->profB)->remote);
    }

    public function test_closing_one_class_keeps_the_visio_open_for_the_others(): void
    {
        $sitting = $this->create();
        $this->sittings()->scheduleAll($sitting, $this->direction);
        foreach ($this->sittings()->rollCall($sitting) as $person) {
            $this->sittings()->recordAttendance($sitting, $person['user_id'], 'present', $this->direction);
        }
        $this->sittings()->startAll($sitting->fresh(), $this->direction, now()->setDate(2026, 11, 20));
        $meetings = app(CouncilMeetingService::class);
        [$a, $b] = [$sitting->councils()->where('school_class_id', $this->class->id)->firstOrFail(), $sitting->councils()->where('school_class_id', $this->other->id)->firstOrFail()];
        $meeting = $meetings->start($a, $this->direction, 'video');

        $finish = function (Council $council) {
            foreach ($council->students()->get() as $row) {
                app(CouncilSession::class)->saveStudent($council->fresh(), $row, ['general_appreciation' => 'Bien', 'review_status' => 'reviewed', 'decisions' => []], $this->direction);
            }
            app(CouncilSession::class)->endDeliberation($council->fresh(), $this->direction);
        };

        $finish($a);
        $this->assertNull($meeting->fresh()->ended_at, 'BTS2 délibère encore : la visio continue.');
        $finish($b);
        $this->assertNotNull($meeting->fresh()->ended_at, 'Dernière classe terminée : la visio s’arrête.');
    }

    public function test_the_direction_creates_a_sitting_from_the_screen(): void
    {
        $this->actingAs($this->direction)->get(route('admin.council-sittings.create'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/CouncilSittings/Create')->has('classes', 2));
        $this->actingAs($this->secretary)->get(route('admin.council-sittings.create'))->assertForbidden();

        $this->actingAs($this->direction)->post(route('admin.council-sittings.store'), $this->frame() + [
            'classes' => [['school_class_id' => $this->class->id, 'main_teacher_id' => $this->profA->id], ['school_class_id' => $this->other->id, 'main_teacher_id' => $this->profB->id]],
            'members' => [['user_id' => $this->viesco->id, 'function' => 'school_life']],
        ])->assertRedirect();

        $sitting = CouncilSitting::firstOrFail();
        $this->actingAs($this->direction)->get(route('admin.council-sittings.show', $sitting))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/CouncilSittings/Show')->has('councils', 2)->has('rollCall'));
        $this->actingAs($this->direction)->get(route('admin.councils.show', $sitting->councils()->first()))->assertInertia(fn (Assert $page) => $page
            ->where('council.sitting.id', $sitting->id));
    }
}

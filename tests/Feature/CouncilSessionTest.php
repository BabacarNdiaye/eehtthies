<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\DecisionType;
use App\Models\DisciplineRecord;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Mode conseil (E05) et vue projetée (E06) : enregistrement élève par élève, verrou optimiste, élève projeté par
 * sondage, confidentialité de la projection (ENF-02), fin de la délibération (SEA-12).
 */
class CouncilSessionTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $president;

    private User $memberTeacher;

    private Council $council;

    private CouncilStudent $awa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();

        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $awa, 9);
        DisciplineRecord::create(['student_id' => $awa->id, 'school_class_id' => $this->class->id, 'occurred_on' => '2026-10-02', 'level' => 'blame', 'reason' => 'MOTIF-SECRET-SANCTION']);

        $this->president = $this->staff('responsable-pedagogique', 'Présidente');
        $this->memberTeacher = $this->teacher('Membre')[0];
        $this->council = $this->open([], [['user_id' => $this->memberTeacher->id, 'function' => 'teacher']]);
        $this->awa = $this->council->students()->firstOrFail();
        $this->awa->update(['main_teacher_summary' => 'SYNTHESE-INTERNE']);
    }

    private function open(array $frame = [], array $members = []): Council
    {
        $workflow = app(CouncilWorkflow::class);
        $council = $this->makeCouncil($frame + ['president_id' => $this->president->id], $members, $this->president);
        $workflow->schedule($council, $this->president);
        $council->members()->get()->each(fn (CouncilMember $member) => $member->update(['attendance' => 'present']));
        $workflow->start($council->fresh(), $this->president, Carbon::parse('2026-11-20 15:00'));

        return $council->fresh();
    }

    private function save(array $payload, ?User $as = null, ?CouncilStudent $row = null)
    {
        $row ??= $this->awa;

        return $this->actingAs($as ?? $this->president)->putJson(route('council.session.save', [$this->council, $row]), $payload + [
            'general_appreciation' => 'Ensemble fragile, des efforts à poursuivre.',
            'review_status' => 'reviewed',
            'decisions' => [],
            'revision' => $row->fresh()->revision,
        ]);
    }

    private function type(string $code): int
    {
        return DecisionType::where('code', $code)->value('id');
    }

    public function test_the_session_page_shows_the_students_and_the_decisions_of_the_term(): void
    {
        $this->actingAs($this->president)->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->component('Council/Session')
            ->where('can.conduct', true)
            ->has('students', 1)
            ->where('students.0.main_teacher_summary', 'SYNTHESE-INTERNE')
            ->where('students.0.discipline.records.0.reason', 'MOTIF-SECRET-SANCTION')
            ->where('students.0.alert_level', 'red')
            ->where('decisionTypes', fn ($types) => collect($types)->doesntContain(fn ($type) => $type['category'] === 'orientation')));
    }

    public function test_a_teacher_member_follows_the_session_without_discipline_details_and_cannot_write(): void
    {
        $this->actingAs($this->memberTeacher)->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('can.conduct', false)
            ->where('students.0.discipline.count', 1)
            ->where('students.0.discipline.records', []));

        $this->save([], $this->memberTeacher)->assertForbidden();
    }

    public function test_outsiders_students_and_parents_cannot_open_the_session(): void
    {
        $this->actingAs($this->teacher('Autre')[0])->get(route('council.session.show', $this->council))->assertForbidden();
        $this->actingAs($this->staff('eleve'))->get(route('council.session.show', $this->council))->assertForbidden();
        $this->actingAs($this->staff('parent'))->getJson(route('council.projection.state', $this->council))->assertForbidden();
    }

    public function test_a_student_is_saved_with_decisions_and_the_change_is_journaled(): void
    {
        $this->save(['decisions' => [['decision_type_id' => $this->type('avertissement_travail'), 'reason' => 'Travail insuffisant'], ['decision_type_id' => $this->type('soutien')]]])
            ->assertOk()
            ->assertJsonPath('revision', 1);

        $this->awa->refresh();
        $this->assertSame('reviewed', $this->awa->review_status);
        $this->assertSame('Ensemble fragile, des efforts à poursuivre.', $this->awa->general_appreciation);
        $this->assertSame(2, $this->awa->decisions()->count());
        $this->assertSame($this->president->id, CouncilDecision::first()->decided_by);

        $entry = Activity::where('description', 'Élève examiné en séance')->firstOrFail();
        $this->assertSame($this->awa->student_id, $entry->properties['student_id']);
        $this->assertSame(['avertissement_travail (Travail insuffisant)', 'soutien'], $entry->properties['new']['decisions']);
        $this->assertSame([], $entry->properties['old']['decisions']);
    }

    public function test_saving_again_replaces_the_decisions(): void
    {
        $this->save(['decisions' => [['decision_type_id' => $this->type('soutien')]]]);
        $this->save(['decisions' => [['decision_type_id' => $this->type('entretien_famille')]]]);

        $this->assertSame([$this->type('entretien_famille')], $this->awa->decisions()->pluck('decision_type_id')->all());
    }

    public function test_an_incompatible_set_answers_422_with_its_code_and_saves_nothing(): void
    {
        $this->save(['decisions' => [['decision_type_id' => $this->type('felicitations')], ['decision_type_id' => $this->type('blame'), 'reason' => 'X']]])
            ->assertStatus(422)
            ->assertJsonPath('code', 'DECISION_INCOMPATIBLE');

        $this->assertSame(0, CouncilDecision::count());
        $this->assertSame('pending', $this->awa->fresh()->review_status);
    }

    public function test_a_stale_revision_answers_409_with_the_saved_version(): void
    {
        $this->save(['general_appreciation' => 'Premier poste']);

        $this->save(['general_appreciation' => 'Second poste', 'revision' => 0])
            ->assertStatus(409)
            ->assertJsonPath('code', 'STALE')
            ->assertJsonPath('current.general_appreciation', 'Premier poste');

        $this->assertSame('Premier poste', $this->awa->fresh()->general_appreciation);
    }

    public function test_the_projection_follows_the_focused_student_by_polling(): void
    {
        $initial = $this->actingAs($this->president)->getJson(route('council.projection.state', $this->council))->json();
        $this->assertNull($initial['student']);

        $this->actingAs($this->president)->postJson(route('council.session.focus', $this->council), ['council_student_id' => $this->awa->id])->assertOk();

        $this->actingAs($this->president)->getJson(route('council.projection.state', [$this->council, 'since' => $initial['version']]))
            ->assertJsonPath('changed', true)
            ->assertJsonPath('student.name', 'Awa Diop');

        $version = $this->council->fresh()->focus_version;
        $this->actingAs($this->president)->getJson(route('council.projection.state', [$this->council, 'since' => $version]))
            ->assertExactJson(['version' => $version, 'changed' => false]);

        // Une décision enregistrée pour l'élève projeté apparaît au sondage suivant.
        $this->save(['decisions' => [['decision_type_id' => $this->type('encouragements')]]]);
        $this->actingAs($this->president)->getJson(route('council.projection.state', [$this->council, 'since' => $version]))
            ->assertJsonPath('changed', true)
            ->assertJsonPath('student.decisions.0', 'Encouragements');
    }

    public function test_the_projection_never_carries_anything_internal(): void
    {
        $this->save(['decisions' => [['decision_type_id' => $this->type('avertissement_conduite'), 'reason' => 'MOTIF-DECISION']]]);
        $this->actingAs($this->president)->postJson(route('council.session.focus', $this->council), ['council_student_id' => $this->awa->id]);

        $state = $this->actingAs($this->president)->getJson(route('council.projection.state', $this->council))->getContent();
        $props = $this->actingAs($this->president)->get(route('council.projection.show', $this->council))->viewData('page')['props'];
        // Les données partagées (compte connecté, permissions) ne viennent pas de la projection : seules ses props propres comptent.
        $page = json_encode(['council' => $props['council'], 'state' => $props['state']]);

        foreach ([$state, $page] as $payload) {
            $this->assertStringContainsString('Awa Diop', $payload);
            $this->assertStringContainsString('Avertissement de conduite', $payload, 'La décision enregistrée est projetée.');
            foreach (['SYNTHESE-INTERNE', 'MOTIF-SECRET-SANCTION', 'MOTIF-DECISION', 'alert_reasons', 'main_teacher_summary', 'discipline'] as $secret) {
                $this->assertStringNotContainsString($secret, $payload, "La projection ne doit pas contenir « {$secret} ».");
            }
        }
    }

    public function test_the_deliberation_cannot_end_while_a_student_is_not_examined(): void
    {
        $this->actingAs($this->president)->postJson(route('council.session.end', $this->council))
            ->assertStatus(422)
            ->assertJsonPath('code', 'COUNCIL_DELIBERATION_INCOMPLETE');

        $this->save(['review_status' => 'on_hold']);
        $this->actingAs($this->president)->postJson(route('council.session.end', $this->council))->assertStatus(422);

        $this->save(['general_appreciation' => '', 'review_status' => 'reviewed']);
        $response = $this->actingAs($this->president)->postJson(route('council.session.end', $this->council))->assertStatus(422);
        $this->assertStringContainsString('appréciation générale', $response->json('message'), 'RG-11');
    }

    public function test_the_deliberation_ends_once_everyone_is_examined(): void
    {
        $this->save([]);

        $this->actingAs($this->president)->post(route('council.session.end', $this->council))->assertRedirect(route('admin.councils.show', $this->council));

        $this->council->refresh();
        $this->assertSame(Council::DRAFTING_MINUTES, $this->council->status);
        $this->assertNotNull($this->council->ended_at);
        $this->save([])->assertStatus(422)->assertJsonPath('code', 'COUNCIL_WRONG_STATUS');
    }

    public function test_at_the_end_of_the_year_every_student_needs_an_orientation(): void
    {
        $this->council = $this->open(['term' => 'Semestre 2', 'is_end_of_year' => true]);
        $this->awa = $this->council->students()->firstOrFail();

        $this->save([]);
        $response = $this->actingAs($this->president)->postJson(route('council.session.end', $this->council))->assertStatus(422);
        $this->assertStringContainsString('orientation', $response->json('message'), 'RG-10');

        $this->save(['decisions' => [['decision_type_id' => $this->type('passage')]]]);
        $this->actingAs($this->president)->postJson(route('council.session.end', $this->council))->assertRedirect();
        $this->assertSame(Council::DRAFTING_MINUTES, $this->council->fresh()->status);
    }

    public function test_a_student_who_left_needs_nothing(): void
    {
        $this->awa->update(['has_left_class' => true]);

        $this->actingAs($this->president)->post(route('council.session.end', $this->council))->assertRedirect();

        $this->assertSame(Council::DRAFTING_MINUTES, $this->council->fresh()->status);
    }

    public function test_session_notes_are_saved(): void
    {
        $this->actingAs($this->president)->putJson(route('council.session.notes', $this->council), ['session_notes' => 'Classe dynamique'])->assertOk();

        $this->assertSame('Classe dynamique', $this->council->fresh()->session_notes);
    }

    public function test_a_teacher_president_can_conduct_from_outside_the_admin(): void
    {
        $teacherPresident = $this->teacher('Présidence')[0];
        $other = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $this->pupil('Moussa', 'Fall', $other);
        $this->president = $teacherPresident;
        $this->council = $this->open(['school_class_id' => $other->id]);
        $row = $this->council->students()->firstOrFail();

        $this->save([], $teacherPresident, $row)->assertOk();
        $this->actingAs($teacherPresident)->post(route('council.session.end', $this->council))->assertRedirect(route('teacher.councils.show', $this->council));
    }
}

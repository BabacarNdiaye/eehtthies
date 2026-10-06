<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\DecisionType;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Le conseil vu de l'espace enseignant : liste des conseils où l'on siège, fiche du conseil et synthèse du professeur
 * principal (PRE-05) avec verrou optimiste.
 */
class TeacherCouncilTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $principal;

    private User $member;

    private Council $council;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();

        $this->pupil('Awa');
        $this->principal = $this->teacher('Principal')[0];
        $this->member = $this->teacher('Membre')[0];
        $this->council = $this->makeCouncil(['main_teacher_id' => $this->principal->id], [['user_id' => $this->member->id, 'function' => 'teacher']]);
    }

    private function row()
    {
        return $this->council->students()->firstOrFail();
    }

    public function test_a_teacher_lists_the_councils_they_sit_on(): void
    {
        $this->actingAs($this->member)->get(route('teacher.councils.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/Councils/Index')
            ->has('councils', 1)
            ->where('councils.0.function_label', 'Enseignant(e)'));

        $this->actingAs($this->teacher('Autre')[0])->get(route('teacher.councils.index'))->assertInertia(fn (Assert $page) => $page->has('councils', 0));
    }

    public function test_a_teacher_outside_the_council_cannot_open_it(): void
    {
        $this->actingAs($this->teacher('Autre')[0])->get(route('teacher.councils.show', $this->council))->assertForbidden();
    }

    public function test_the_main_teacher_writes_the_synthesis_but_a_simple_member_does_not(): void
    {
        $this->actingAs($this->principal)->get(route('teacher.councils.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/Councils/Show')
            ->where('canWriteSynthesis', true)
            ->has('decisionTypes'));

        $this->actingAs($this->member)->get(route('teacher.councils.show', $this->council))->assertInertia(fn (Assert $page) => $page->where('canWriteSynthesis', false));
    }

    public function test_orientation_decisions_are_only_offered_at_the_end_of_the_year(): void
    {
        $offered = fn () => collect($this->actingAs($this->principal)->get(route('teacher.councils.show', $this->council))->viewData('page')['props']['decisionTypes'])->pluck('label');

        $this->assertNotContains('Redoublement', $offered());

        Council::whereKey($this->council->id)->update(['is_end_of_year' => true]);
        $this->assertContains('Redoublement', $offered());
    }

    public function test_the_synthesis_is_saved_with_its_recommendation_and_logged(): void
    {
        $type = DecisionType::where('code', 'encouragements')->firstOrFail();
        $row = $this->row();

        $this->actingAs($this->principal)->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), [
            'summary' => 'Élève sérieuse, en progrès.', 'recommendation_id' => $type->id, 'revision' => 0,
        ])->assertOk()->assertJsonPath('revision', 1);

        $row->refresh();
        $this->assertSame('Élève sérieuse, en progrès.', $row->main_teacher_summary);
        $this->assertSame($type->id, $row->main_teacher_recommendation_id);
        $entry = Activity::where('description', 'Synthèse du professeur principal enregistrée')->firstOrFail();
        $this->assertSame($this->council->id, $entry->properties['council_id']);
        $this->assertSame($row->student_id, $entry->properties['student_id']);
        $this->assertSame('Élève sérieuse, en progrès.', $entry->properties['new']['summary']);
    }

    public function test_a_concurrent_change_answers_409_with_the_saved_version(): void
    {
        $row = $this->row();
        $this->actingAs($this->principal)->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), ['summary' => 'Première version', 'revision' => 0]);

        $this->actingAs($this->principal)->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), ['summary' => 'Version périmée', 'revision' => 0])
            ->assertStatus(409)
            ->assertJsonPath('code', 'STALE')
            ->assertJsonPath('current.summary', 'Première version');

        $this->assertSame('Première version', $row->fresh()->main_teacher_summary);
    }

    public function test_a_simple_member_or_an_outsider_cannot_write_the_synthesis(): void
    {
        $row = $this->row();

        $this->actingAs($this->member)->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), ['summary' => 'X', 'revision' => 0])->assertForbidden();
        $this->actingAs($this->teacher('Autre')[0])->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), ['summary' => 'X', 'revision' => 0])->assertForbidden();
        $this->assertNull($row->fresh()->main_teacher_summary);
    }

    public function test_the_synthesis_is_read_only_once_the_session_started(): void
    {
        $row = $this->row();
        Council::whereKey($this->council->id)->update(['status' => Council::IN_SESSION, 'started_at' => now()]);

        $this->actingAs($this->principal)->patchJson(route('teacher.councils.synthesis', [$this->council, $row]), ['summary' => 'Trop tard', 'revision' => 0])
            ->assertStatus(422)
            ->assertJsonPath('code', 'COUNCIL_WRONG_STATUS');
    }

    public function test_a_student_of_another_council_cannot_be_reached_through_this_one(): void
    {
        $otherClass = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $this->pupil('Moussa', 'Fall', $otherClass);
        $other = $this->makeCouncil(['school_class_id' => $otherClass->id, 'main_teacher_id' => $this->principal->id]);

        $this->actingAs($this->principal)->patchJson(route('teacher.councils.synthesis', [$this->council, $other->students()->firstOrFail()]), ['summary' => 'X', 'revision' => 0])
            ->assertNotFound();
    }
}

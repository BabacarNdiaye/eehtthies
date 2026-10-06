<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilObservation;
use App\Models\User;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Pré-conseil (PRE-01 à PRE-07) : chaque enseignant saisit pour SES matières, avant la date limite ; avancement par
 * enseignant pour le professeur principal ; appréciations reprises en séance et à la projection (sans l'interne).
 */
class PreCouncilTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $cook;

    private User $english;

    private Council $council;

    private int $cuisineId;

    private int $anglaisId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->pupil('Awa');
        $this->pupil('Moussa');
        $cuisine = $this->subject('Cuisine');
        $anglais = $this->subject('Anglais');
        $this->cuisineId = $cuisine->id;
        $this->anglaisId = $anglais->id;
        $this->cook = $this->teacher('Cuisinier', [$cuisine])[0];
        $this->english = $this->teacher('Angliciste', [$anglais])[0];
        $this->council = $this->makeCouncil(['main_teacher_id' => $this->cook->id, 'preconseil_deadline' => '2026-11-18 18:00:00'], [
            ['user_id' => $this->english->id, 'function' => 'teacher'],
        ]);
    }

    private function entry(int $subjectId, array $values = []): array
    {
        return $values + [
            'council_student_id' => $this->council->students()->first()->id,
            'subject_id' => $subjectId,
            'appreciation' => 'Bon travail',
            'internal_note' => 'NOTE-INTERNE',
            'difficulty' => 'methode',
            'recommendation' => 'Encouragements',
        ];
    }

    public function test_a_teacher_sees_only_their_subjects_with_the_bank(): void
    {
        $this->travelTo('2026-11-10 10:00');

        $this->actingAs($this->english)->get(route('teacher.councils.precouncil', $this->council))->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/Councils/PreCouncil')
            ->where('open', true)
            ->has('subjects', 1)
            ->where('subjects.0.name', 'Anglais')
            ->has('students', 2)
            ->has('bank')
            ->where('progress', null));
    }

    public function test_the_council_page_of_the_teacher_links_to_the_pre_council(): void
    {
        $this->travelTo('2026-11-10 10:00');

        $this->actingAs($this->english)->get(route('teacher.councils.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('preCouncil.open', true)
            ->where('preCouncil.subjects', ['Anglais']));

        $this->travelTo('2026-11-19 10:00');
        $this->actingAs($this->english)->get(route('teacher.councils.show', $this->council))->assertInertia(fn (Assert $page) => $page->where('preCouncil.open', false));
    }

    public function test_a_teacher_saves_their_appreciations_and_not_another_subject(): void
    {
        $this->travelTo('2026-11-10 10:00');

        $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$this->entry($this->anglaisId)]])
            ->assertOk()->assertJsonPath('saved.0.revision', 1);
        $this->assertSame('Bon travail', CouncilObservation::firstOrFail()->appreciation);

        $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$this->entry($this->cuisineId)]])
            ->assertStatus(422)->assertJsonPath('code', 'PRECOUNCIL_NOT_YOUR_SUBJECT');
    }

    public function test_a_stale_line_is_returned_as_a_conflict(): void
    {
        $this->travelTo('2026-11-10 10:00');
        $save = fn (array $entry) => $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$entry]]);

        $save($this->entry($this->anglaisId));
        $save($this->entry($this->anglaisId, ['appreciation' => 'Version périmée', 'revision' => 0]))
            ->assertStatus(409)->assertJsonPath('conflicts.0.appreciation', 'Bon travail');
    }

    public function test_entries_are_read_only_after_the_deadline(): void
    {
        $this->travelTo('2026-11-19 08:00');

        $this->actingAs($this->english)->get(route('teacher.councils.precouncil', $this->council))->assertInertia(fn (Assert $page) => $page->where('open', false));
        $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$this->entry($this->anglaisId)]])
            ->assertStatus(422)->assertJsonPath('code', 'PRECOUNCIL_CLOSED');
    }

    public function test_the_main_teacher_sees_everyones_progress(): void
    {
        $this->travelTo('2026-11-10 10:00');
        $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$this->entry($this->anglaisId)]]);

        $progress = collect($this->actingAs($this->cook)->get(route('teacher.councils.precouncil', $this->council))->viewData('page')['props']['progress'])->keyBy('teacher');

        $this->assertSame(['filled' => 1, 'total' => 2], collect($progress['Angliciste Prof'])->only(['filled', 'total'])->all());
        $this->assertSame(0, $progress['Cuisinier Prof']['filled']);
    }

    public function test_appreciations_reach_the_session_and_the_projection_without_the_internal_note(): void
    {
        $this->travelTo('2026-11-10 10:00');
        $this->actingAs($this->english)->putJson(route('teacher.councils.precouncil.save', $this->council), ['entries' => [$this->entry($this->anglaisId)]]);
        $president = $this->staff('direction');
        $this->council->update(['president_id' => $president->id]);
        $this->travelTo('2026-11-20 15:00');
        app(CouncilWorkflow::class)->schedule($this->council->fresh(), $president);
        $this->council->members()->get()->each(fn ($member) => $member->update(['attendance' => 'present']));
        app(CouncilWorkflow::class)->start($this->council->fresh(), $president);
        $row = $this->council->students()->first();

        $this->actingAs($president)->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('students.0.observations.0.internal_note', 'NOTE-INTERNE')
            ->has('bank')
            ->has('levels'));

        $this->actingAs($president)->postJson(route('council.session.focus', $this->council), ['council_student_id' => $row->id]);
        $state = $this->actingAs($president)->getJson(route('council.projection.state', $this->council))->getContent();
        $this->assertStringContainsString('Bon travail', $state);
        $this->assertStringNotContainsString('NOTE-INTERNE', $state);
        $this->assertStringNotContainsString('Encouragements', $state, 'La recommandation est interne.');
    }
}

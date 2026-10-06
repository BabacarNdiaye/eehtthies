<?php

namespace Tests\Feature;

use App\Models\CouncilInternshipEvaluation;
use App\Models\InternshipCriterion;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/** Grille de stage (PAR-07, PRE-06) : saisie par le personnel des stages, lue en séance. */
class CouncilInternshipTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    public function test_the_internship_grid_is_filled_by_the_internship_staff_and_read_in_session(): void
    {
        $this->councilWorld();
        $this->pupil('Awa');
        $president = $this->staff('direction');
        $council = $this->makeCouncil(['president_id' => $president->id], [], $president);
        $row = $council->students()->firstOrFail();
        $criterion = InternshipCriterion::active()->firstOrFail();

        $this->assertSame(6, InternshipCriterion::count(), 'Grille de départ installée par la migration.');

        $this->actingAs($this->staff('secretariat'))->put(route('admin.councils.internship.save', [$council, $row]), [])->assertForbidden();

        $administration = $this->staff('administration');
        $this->actingAs($administration)->get(route('admin.councils.internship', $council))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Internship')->where('canWrite', true)->has('criteria', 6));

        $this->actingAs($administration)->put(route('admin.councils.internship.save', [$council, $row]), [
            'company_name' => 'Hôtel Téranga', 'tutor_name' => 'Mme Sow',
            'ratings' => [$criterion->id => ['rating' => 'tres_satisfaisant', 'comment' => 'Excellente présentation']],
        ])->assertSessionHas('success');

        $this->assertSame('tres_satisfaisant', CouncilInternshipEvaluation::where('criterion_id', $criterion->id)->value('rating'));
        $this->actingAs($administration)->put(route('admin.councils.internship.save', [$council, $row]), [
            'ratings' => [$criterion->id => ['rating' => 'parfait']],
        ])->assertSessionHasErrors();

        $this->travelTo('2026-11-20 15:00');
        app(CouncilWorkflow::class)->schedule($council->fresh(), $president);
        $council->members()->get()->each(fn ($member) => $member->update(['attendance' => 'present']));
        app(CouncilWorkflow::class)->start($council->fresh(), $president);

        $this->actingAs($president)->get(route('council.session.show', $council))->assertInertia(fn (Assert $page) => $page
            ->where('students.0.internship_evaluation.0.rating', 'Très satisfaisant'));
    }
}

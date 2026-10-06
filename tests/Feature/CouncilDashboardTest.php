<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilFollowUp;
use App\Models\CouncilStudent;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Tableau de bord des conseils (E11, DIR-01 à DIR-05) : avancement des conseils, indicateurs académiques, répartition
 * des décisions, comparaisons, réalisation des actions de suivi ; filtres et export.
 */
class CouncilDashboardTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $direction;

    private Council $closed;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $awa = $this->pupil('Awa');
        $moussa = $this->pupil('Moussa', 'Fall');
        $this->direction = $this->staff('direction');

        $this->closed = $this->openCouncil($this->direction);
        $figures = [$awa->id => [15.5, 'green', 2], $moussa->id => [8.25, 'red', 12]];
        foreach ($this->closed->students()->get() as $row) {
            [$average, $level, $hours] = $figures[$row->student_id];
            CouncilStudent::whereKey($row->id)->update(['general_average' => $average, 'alert_level' => $level, 'unjustified_absence_hours' => $hours]);
        }
        $this->closeCouncil($this->closed, $this->direction, [
            $awa->id => [['felicitations']],
            $moussa->id => [['avertissement_travail', 'Travail insuffisant'], ['soutien']],
        ]);

        // Une autre classe de la même formation : conseil seulement en brouillon.
        $other = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $this->pupil('Fatou', 'Sow', $other);
        $this->makeCouncil(['school_class_id' => $other->id], [], $this->direction);
    }

    public function test_the_dashboard_counts_councils_results_decisions_and_actions(): void
    {
        $this->actingAs($this->direction)->get(route('admin.council-dashboard.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Dashboard')
            ->where('filters.academic_year_id', $this->year->id)
            ->where('statuses.programmed', 1)
            ->where('statuses.held', 0)
            ->where('statuses.to_validate', 0)
            ->where('statuses.closed', 1)
            ->where('indicators.examined', 2)
            ->where('indicators.evaluated', 2)
            ->where('indicators.pass_rate', 50)
            ->where('indicators.red', 1)
            ->where('indicators.orange', 0)
            ->where('indicators.unjustified_hours', 14)
            ->where('decisions', fn ($decisions) => collect($decisions)->pluck('count', 'label')->all() === ['Félicitations' => 1, 'Avertissement de travail' => 1, 'Soutien pédagogique' => 1])
            ->where('byClass.0.label', 'BTS1 · Semestre 1')
            ->where('byClass.0.pass_rate', 50)
            ->where('byFormation.0.label', 'BTS Cuisine')
            ->where('byFormation.0.red', 1)
            ->where('byFormation.0.green', 1)
            ->where('followUps.total', 1)
            ->where('followUps.done', 0)
            ->where('followUps.rate', 0)
            ->has('councils', 2));

        CouncilFollowUp::query()->update(['status' => 'done']);
        $this->actingAs($this->direction)->get(route('admin.council-dashboard.index'))->assertInertia(fn (Assert $page) => $page
            ->where('followUps.done', 1)
            ->where('followUps.rate', 100));
    }

    public function test_filters_narrow_every_figure(): void
    {
        $this->actingAs($this->direction)->get(route('admin.council-dashboard.index', ['term' => 'Semestre 2']))->assertInertia(fn (Assert $page) => $page
            ->where('statuses.closed', 0)
            ->where('statuses.programmed', 0)
            ->where('indicators.examined', 0)
            ->where('indicators.pass_rate', null)
            ->where('decisions', [])
            ->where('followUps.total', 0));

        $this->actingAs($this->direction)->get(route('admin.council-dashboard.index', ['school_class_id' => $this->class->id]))->assertInertia(fn (Assert $page) => $page
            ->where('statuses.programmed', 0)
            ->where('statuses.closed', 1)
            ->has('councils', 1));
    }

    public function test_the_export_lists_one_line_per_council(): void
    {
        $response = $this->actingAs($this->direction)->get(route('admin.council-dashboard.export'));
        $response->assertOk();
        $csv = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $lines = array_values(array_filter(explode("\n", trim(substr($csv, 3)))));
        $this->assertCount(3, $lines);
        $this->assertStringContainsString('Classe', $lines[0]);
        $this->assertStringContainsString('BTS1', implode("\n", $lines));
    }

    public function test_only_the_direction_and_the_pedagogical_manager_open_it(): void
    {
        $this->actingAs($this->staff('responsable-pedagogique'))->get(route('admin.council-dashboard.index'))->assertOk();
        $this->actingAs($this->staff('secretariat'))->get(route('admin.council-dashboard.index'))->assertForbidden();
        $this->actingAs($this->staff('vie-scolaire'))->get(route('admin.council-dashboard.export'))->assertForbidden();
    }
}

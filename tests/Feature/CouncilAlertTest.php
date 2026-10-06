<?php

namespace Tests\Feature;

use App\Models\AlertThreshold;
use App\Models\Formation;
use App\Services\Council\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RG-06 et RG-07 : la pastille suit les seuils (valeurs par défaut du cahier des charges), la règle la plus grave
 * l'emporte, chaque motif est donné. Bornes exactes testées une à une.
 */
class CouncilAlertTest extends TestCase
{
    use RefreshDatabase;

    private function evaluate(array $facts, ?int $formationId = null): array
    {
        return app(AlertService::class)->evaluate($facts + [
            'average' => 14.0, 'unjustified_hours' => 0.0, 'failed_subjects' => 0, 'progression' => null, 'max_sanction' => null,
        ], AlertThreshold::resolve($formationId));
    }

    private function level(array $facts): string
    {
        return $this->evaluate($facts)['level'];
    }

    public function test_a_good_situation_is_green_with_no_reason(): void
    {
        $this->assertSame(['level' => 'green', 'reasons' => []], $this->evaluate([]));
    }

    public function test_average_boundaries(): void
    {
        $this->assertSame('red', $this->level(['average' => 9.99]));
        $this->assertSame('orange', $this->level(['average' => 10.0]));
        $this->assertSame('orange', $this->level(['average' => 11.99]));
        $this->assertSame('green', $this->level(['average' => 12.0]));
        $this->assertSame('green', $this->level(['average' => null]), 'Sans moyenne, pas de motif de moyenne.');
    }

    public function test_absence_hour_boundaries(): void
    {
        $this->assertSame('green', $this->level(['unjustified_hours' => 9.5]));
        $this->assertSame('orange', $this->level(['unjustified_hours' => 10.0]), 'Orange à partir de 10 h.');
        $this->assertSame('orange', $this->level(['unjustified_hours' => 20.0]), '20 h tout juste : encore orange.');
        $this->assertSame('red', $this->level(['unjustified_hours' => 20.5]), 'Plus de 20 h : rouge.');
    }

    public function test_failed_subject_boundaries(): void
    {
        $this->assertSame('green', $this->level(['failed_subjects' => 1]));
        $this->assertSame('orange', $this->level(['failed_subjects' => 2]));
        $this->assertSame('orange', $this->level(['failed_subjects' => 3]));
        $this->assertSame('red', $this->level(['failed_subjects' => 4]));
    }

    public function test_progression_boundaries(): void
    {
        $this->assertSame('green', $this->level(['progression' => -1.99]));
        $this->assertSame('orange', $this->level(['progression' => -2.0]));
        $this->assertSame('green', $this->level(['progression' => 3.0]));
        $this->assertSame('green', $this->level(['progression' => null]));
    }

    public function test_sanction_boundaries(): void
    {
        $this->assertSame('green', $this->level(['max_sanction' => 'blame']));
        $this->assertSame('green', $this->level(['max_sanction' => 'exclusion_cours']));
        $this->assertSame('red', $this->level(['max_sanction' => 'exclusion']));
    }

    public function test_the_most_serious_rule_wins_and_lists_its_reasons(): void
    {
        $result = $this->evaluate(['average' => 11.0, 'unjustified_hours' => 25.0, 'max_sanction' => 'exclusion']);

        $this->assertSame('red', $result['level']);
        $this->assertCount(2, $result['reasons']);
        $this->assertStringContainsString('25 h', $result['reasons'][0]);
        $this->assertStringContainsString('Exclusion temporaire', $result['reasons'][1]);
    }

    public function test_reasons_are_readable_in_french(): void
    {
        $reasons = $this->evaluate(['average' => 10.5, 'progression' => -2.5])['reasons'];

        $this->assertSame(['Moyenne générale de 10,5 (sous 12)', 'Baisse de 2,5 point(s) depuis la période précédente'], $reasons);
    }

    public function test_an_empty_threshold_is_not_used(): void
    {
        AlertThreshold::whereNull('formation_id')->update(['failed_subjects_count' => null]);

        $this->assertSame('green', $this->level(['failed_subjects' => 9]));
    }

    public function test_the_thresholds_of_a_formation_replace_the_default_ones(): void
    {
        $formation = Formation::create(['name' => 'CAP', 'code' => 'CAP-'.uniqid(), 'slug' => 'cap-'.uniqid()]);
        AlertThreshold::saveFor($formation->id, 'red', ['max_average' => 8]);
        AlertThreshold::saveFor($formation->id, 'orange', ['max_average' => 10]);

        $this->assertSame('orange', $this->evaluate(['average' => 9.0], $formation->id)['level']);
        $this->assertSame('red', $this->evaluate(['average' => 9.0])['level']);
    }
}

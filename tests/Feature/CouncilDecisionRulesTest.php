<?php

namespace Tests\Feature;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\DecisionType;
use App\Services\Council\DecisionRulesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Règles des décisions : RG-08 (une distinction), RG-09 (distinction ⟂ alerte), PAR-03 (incompatibilités de l'école),
 * RG-10 (orientation en fin d'année seulement), DEC-01 (une orientation), DEC-04 (motif obligatoire).
 */
class CouncilDecisionRulesTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private Council $term;

    private Council $endOfYear;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->term = $this->makeCouncil();
        $this->endOfYear = $this->makeCouncil(['term' => 'Semestre 2', 'is_end_of_year' => true]);
    }

    private function pick(string $code, ?string $reason = null): array
    {
        return ['decision_type_id' => DecisionType::where('code', $code)->value('id'), 'reason' => $reason];
    }

    private function assertRefused(string $code, Council $council, array $selections): void
    {
        try {
            app(DecisionRulesService::class)->validate($council, $selections);
        } catch (CouncilException $exception) {
            $this->assertSame($code, $exception->errorCode, $exception->getMessage());
            $this->assertSame(422, $exception->status);

            return;
        }

        $this->fail("La règle {$code} aurait dû refuser ces décisions.");
    }

    private function assertAccepted(Council $council, array $selections): array
    {
        return app(DecisionRulesService::class)->validate($council, $selections);
    }

    public function test_rg08_a_single_distinction(): void
    {
        $this->assertCount(1, $this->assertAccepted($this->term, [$this->pick('felicitations')]));
        $this->assertRefused('DECISION_TOO_MANY_DISTINCTIONS', $this->term, [$this->pick('felicitations'), $this->pick('encouragements')]);
    }

    public function test_rg09_a_distinction_never_goes_with_an_alert(): void
    {
        $this->assertRefused('DECISION_INCOMPATIBLE', $this->term, [$this->pick('tableau_honneur'), $this->pick('blame', 'Conduite')]);
    }

    public function test_par03_the_school_incompatibilities_apply_in_both_directions(): void
    {
        $soutien = DecisionType::where('code', 'soutien')->firstOrFail();
        $suivi = DecisionType::where('code', 'suivi_vie_scolaire')->firstOrFail();
        $suivi->syncIncompatibilities([$soutien->id]);

        $this->assertRefused('DECISION_INCOMPATIBLE', $this->term, [$this->pick('soutien'), $this->pick('suivi_vie_scolaire')]);
        $this->assertRefused('DECISION_INCOMPATIBLE', $this->term, [$this->pick('suivi_vie_scolaire'), $this->pick('soutien')]);
    }

    public function test_several_alerts_and_supports_may_be_combined(): void
    {
        $chosen = $this->assertAccepted($this->term, [
            $this->pick('avertissement_travail', 'Travail insuffisant'),
            $this->pick('avertissement_conduite', 'Retards'),
            $this->pick('soutien'),
            $this->pick('entretien_famille'),
        ]);

        $this->assertCount(4, $chosen);
    }

    public function test_rg10_orientation_only_at_the_end_of_the_year(): void
    {
        $this->assertRefused('DECISION_END_OF_YEAR_ONLY', $this->term, [$this->pick('passage')]);
        $this->assertCount(1, $this->assertAccepted($this->endOfYear, [$this->pick('passage')]));
    }

    public function test_dec01_a_single_orientation(): void
    {
        $this->assertRefused('DECISION_TOO_MANY_ORIENTATIONS', $this->endOfYear, [$this->pick('passage'), $this->pick('redoublement', 'Moyenne insuffisante')]);
    }

    public function test_dec04_a_reason_is_required_for_an_alert_and_an_orientation_other_than_the_pass(): void
    {
        $this->assertRefused('DECISION_REASON_REQUIRED', $this->term, [$this->pick('blame')]);
        $this->assertRefused('DECISION_REASON_REQUIRED', $this->term, [$this->pick('avertissement_travail', '   ')]);
        $this->assertRefused('DECISION_REASON_REQUIRED', $this->endOfYear, [$this->pick('redoublement')]);
        $this->assertCount(1, $this->assertAccepted($this->endOfYear, [$this->pick('passage')]));
    }

    public function test_an_inactive_or_unknown_type_is_refused(): void
    {
        DecisionType::where('code', 'soutien')->update(['is_active' => false]);

        $this->assertRefused('DECISION_UNKNOWN', $this->term, [$this->pick('soutien')]);
        $this->assertRefused('DECISION_UNKNOWN', $this->term, [['decision_type_id' => 999999]]);
    }

    public function test_the_same_type_twice_counts_once_and_reasons_are_trimmed(): void
    {
        $chosen = $this->assertAccepted($this->term, [$this->pick('blame', '  Conduite  '), $this->pick('blame', 'Autre')]);

        $this->assertCount(1, $chosen);
        $this->assertSame('Conduite', $chosen[0]['reason']);
    }

    public function test_no_decision_at_all_is_valid_for_a_term_council(): void
    {
        $this->assertSame([], $this->assertAccepted($this->term, []));
    }
}

<?php

namespace Tests\Feature;

use App\Models\ReportCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * SUI-05 : à la clôture, l'appréciation du conseil, la mention publiable et la décision d'orientation passent sur le
 * bulletin ; la génération des bulletins ne les réécrit plus ensuite.
 */
class CouncilReportCardSyncTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        Storage::fake('local');
    }

    public function test_closing_writes_appreciation_mention_and_decision_on_the_bulletin(): void
    {
        $awa = $this->pupil('Awa');
        $moussa = $this->pupil('Moussa');
        $this->grade($this->exam($this->subject('Cuisine'), 'examen', 'Semestre 2'), $awa, 17);
        $president = $this->staff('responsable-pedagogique');
        $council = $this->openCouncil($president, ['term' => 'Semestre 2', 'is_end_of_year' => true]);

        $this->closeCouncil($council, $president, [
            $awa->id => [['felicitations'], ['passage']],
            $moussa->id => [['avertissement_travail', 'Travail insuffisant'], ['redoublement', 'Moyenne insuffisante']],
        ]);

        $awaCard = ReportCard::where('student_id', $awa->id)->where('term', 'Semestre 2')->firstOrFail();
        $this->assertSame($council->id, $awaCard->council_id);
        $this->assertSame('felicitations', $awaCard->mention);
        $this->assertSame('admis', $awaCard->decision);
        $this->assertSame("Appréciation de l'élève {$awa->id}", $awaCard->general_appreciation);
        $this->assertFalse($awaCard->decision_provisional);

        $moussaCard = ReportCard::where('student_id', $moussa->id)->firstOrFail();
        $this->assertSame('avertissement', $moussaCard->mention);
        $this->assertSame('redouble', $moussaCard->decision);
    }

    public function test_an_unpublished_support_decision_does_not_reach_the_bulletin(): void
    {
        $awa = $this->pupil('Awa');
        $president = $this->staff('responsable-pedagogique');
        $council = $this->openCouncil($president);

        $this->closeCouncil($council, $president, [$awa->id => [['soutien']]]);

        $this->assertNull(ReportCard::where('student_id', $awa->id)->value('mention'));
    }

    public function test_generating_the_bulletins_afterwards_keeps_the_council_decision(): void
    {
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine'), 'examen', 'Semestre 2'), $awa, 6);
        $president = $this->staff('responsable-pedagogique');
        $council = $this->openCouncil($president, ['term' => 'Semestre 2', 'is_end_of_year' => true]);
        $this->closeCouncil($council, $president, [$awa->id => [['passage'], ['encouragements']]]);

        $this->actingAs($this->staff('direction'))->post(route('admin.report-cards.generate'), [
            'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id, 'term' => 'Semestre 2',
        ]);

        $card = ReportCard::where('student_id', $awa->id)->firstOrFail();
        $this->assertSame('admis', $card->decision, 'La génération aurait mis « redouble » (6/20) : le conseil a tranché.');
        $this->assertSame('encouragement', $card->mention);
        $this->assertSame(6.0, (float) $card->average, 'Les moyennes, elles, sont recalculées.');
    }
}

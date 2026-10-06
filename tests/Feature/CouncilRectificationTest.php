<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilAppeal;
use App\Models\CouncilDecision;
use App\Models\CouncilMinute;
use App\Models\DecisionType;
use App\Models\ReportCard;
use App\Models\User;
use App\Services\Council\MinutesService;
use App\Support\CouncilSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Rectification par la Direction (REC-01, RG-19) et recours des familles (REC-02, REC-03, RG-20).
 */
class CouncilRectificationTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $direction;

    private Council $council;

    private int $awaId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        Storage::fake('local');
        $this->travelTo(Carbon::parse('2027-06-20 10:00'));

        $awa = $this->pupil('Awa');
        $this->awaId = $awa->id;
        $president = $this->staff('responsable-pedagogique');
        $this->direction = $this->staff('direction');
        $council = $this->openCouncil($president, ['term' => 'Semestre 2', 'is_end_of_year' => true, 'scheduled_at' => '2027-06-20 09:00:00']);
        $this->council = $this->closeCouncil($council, $president, [$awa->id => [['redoublement', 'Moyenne insuffisante']]]);
    }

    private function type(string $code): int
    {
        return DecisionType::where('code', $code)->value('id');
    }

    private function row()
    {
        return $this->council->students()->firstOrFail();
    }

    public function test_the_direction_rectifies_with_a_reason_and_a_new_minutes_version(): void
    {
        $old = CouncilDecision::firstOrFail();

        $this->actingAs($this->direction)->post(route('admin.councils.rectify', [$this->council, $this->row()]), [
            'decisions' => [['decision_type_id' => $this->type('passage')]], 'reason' => '',
        ])->assertSessionHasErrors('reason');

        $this->actingAs($this->direction)->post(route('admin.councils.rectify', [$this->council, $this->row()]), [
            'decisions' => [['decision_type_id' => $this->type('passage')]],
            'general_appreciation' => 'Appréciation rectifiée',
            'reason' => 'Erreur de saisie d’une note de composition',
        ])->assertSessionHas('success');

        $old->refresh();
        $this->assertSame(CouncilDecision::RECTIFIED, $old->status, 'L’ancienne valeur est conservée.');
        $new = CouncilDecision::where('status', CouncilDecision::ACTIVE)->firstOrFail();
        $this->assertSame($new->id, $old->superseded_by);
        $this->assertSame(['1', '2'], CouncilMinute::orderBy('version')->pluck('version')->map(fn ($v) => (string) $v)->all(), 'RG-19 : v1 reste, v2 s’ajoute.');
        $this->assertSame('Erreur de saisie d’une note de composition', CouncilMinute::where('version', 2)->value('rectification_reason'));
        $this->assertSame('admis', ReportCard::where('student_id', $this->awaId)->value('decision'));
        $this->assertSame('Appréciation rectifiée', ReportCard::where('student_id', $this->awaId)->value('general_appreciation'));
        $entry = Activity::where('description', 'like', 'Décision rectifiée%')->firstOrFail();
        $this->assertSame(['redoublement'], $entry->properties['old']['decisions']);
        $this->assertSame(['passage'], $entry->properties['new']['decisions']);

        $minutes = app(MinutesService::class)->data($this->council->fresh(), 2);
        $awa = collect($minutes['students'])->firstWhere('decisions', '!=', []);
        $this->assertSame(['Passage en classe supérieure'], $awa['decisions'], 'Le PV v2 ne reprend pas la décision remplacée.');
    }

    public function test_only_the_direction_rectifies(): void
    {
        $this->actingAs($this->staff('responsable-pedagogique'))->post(route('admin.councils.rectify', [$this->council, $this->row()]), [
            'decisions' => [['decision_type_id' => $this->type('passage')]], 'reason' => 'X',
        ])->assertForbidden();
    }

    public function test_an_appeal_makes_the_decision_provisional_until_its_outcome(): void
    {
        $this->travelTo(Carbon::parse('2027-06-22 10:00'));
        $decision = CouncilDecision::firstOrFail();

        $this->actingAs($this->direction)->post(route('admin.councils.appeals.store', [$this->council, $decision]), [
            'filed_at' => '2027-06-22', 'filed_by_name' => 'M. Diop (père)', 'reason' => 'Contestation du redoublement',
        ])->assertSessionHas('success');

        $this->assertSame(CouncilDecision::PROVISIONAL, $decision->fresh()->status);
        $this->assertTrue(ReportCard::where('student_id', $this->awaId)->value('decision_provisional'));

        $appeal = CouncilAppeal::firstOrFail();
        $this->assertSame('2027-06-28', $appeal->deadline->toDateString(), 'Clôture le 20/06 + 8 jours.');

        $this->actingAs($this->direction)->post(route('admin.councils.appeals.decide', $appeal), ['outcome' => 'upheld', 'comment' => 'Décision confirmée'])->assertSessionHas('success');
        $this->assertSame(CouncilDecision::ACTIVE, $decision->fresh()->status);
        $this->assertFalse(ReportCard::where('student_id', $this->awaId)->value('decision_provisional'));
        $this->assertSame('upheld', $appeal->fresh()->outcome);
    }

    public function test_an_accepted_appeal_rectifies_the_orientation(): void
    {
        $this->travelTo(Carbon::parse('2027-06-22 10:00'));
        $decision = CouncilDecision::firstOrFail();
        $this->actingAs($this->direction)->post(route('admin.councils.appeals.store', [$this->council, $decision]), [
            'filed_at' => '2027-06-22', 'filed_by_name' => 'M. Diop', 'reason' => 'Contestation',
        ]);
        $appeal = CouncilAppeal::firstOrFail();

        $this->actingAs($this->direction)->post(route('admin.councils.appeals.decide', $appeal), ['outcome' => 'modified'])->assertSessionHasErrors('decision_type_id');
        $this->actingAs($this->direction)->post(route('admin.councils.appeals.decide', $appeal), ['outcome' => 'modified', 'decision_type_id' => $this->type('passage'), 'comment' => 'Recours fondé']);

        $appeal->refresh();
        $this->assertSame('modified', $appeal->outcome);
        $this->assertSame($this->type('passage'), CouncilDecision::find($appeal->outcome_decision_id)->decision_type_id);
        $this->assertSame(CouncilDecision::RECTIFIED, $decision->fresh()->status);
        $this->assertSame('admis', ReportCard::where('student_id', $this->awaId)->value('decision'));
        $this->assertSame(2, CouncilMinute::count());
    }

    public function test_an_appeal_after_the_deadline_is_refused(): void
    {
        CouncilSettings::update(['appeal_days' => 3]);
        $decision = CouncilDecision::firstOrFail();

        $this->actingAs($this->direction)->post(route('admin.councils.appeals.store', [$this->council, $decision]), [
            'filed_at' => '2027-06-20', 'filed_by_name' => 'M. Diop', 'reason' => 'Contestation',
        ]);
        $this->assertSame(1, CouncilAppeal::count(), 'Dans le délai.');

        CouncilAppeal::query()->delete();
        CouncilDecision::whereKey($decision->id)->update(['status' => CouncilDecision::ACTIVE]);
        $this->travelTo(Carbon::parse('2027-06-30 10:00'));
        $this->actingAs($this->direction)->post(route('admin.councils.appeals.store', [$this->council, $decision->fresh()]), [
            'filed_at' => '2027-06-30', 'filed_by_name' => 'M. Diop', 'reason' => 'Contestation',
        ])->assertSessionHas('error');
        $this->assertSame(0, CouncilAppeal::count());
    }
}

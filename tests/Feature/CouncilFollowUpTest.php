<?php

namespace Tests\Feature;

use App\Models\CouncilFollowUp;
use App\Models\User;
use App\Notifications\PushAlert;
use App\Services\Council\FollowUpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Actions de suivi : créées à la clôture (RG-12, DEC-06), « Mes actions » (E10), liste générale (E09), rappels J-7 et
 * échéance (SUI-02), affichage au conseil suivant (SUI-03).
 */
class CouncilFollowUpTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $principal;

    private User $president;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        Storage::fake('local');
        $this->principal = $this->teacher('Principal')[0];
        $this->president = $this->staff('responsable-pedagogique');
    }

    private function closedWith(array $decisions)
    {
        $council = $this->openCouncil($this->president, ['main_teacher_id' => $this->principal->id]);

        return $this->closeCouncil($council, $this->president, $decisions);
    }

    public function test_closing_creates_one_action_per_support_decision_for_the_main_teacher(): void
    {
        $this->travelTo(Carbon::parse('2026-11-20 16:00'));
        $awa = $this->pupil('Awa');
        $this->closedWith([$awa->id => [['soutien'], ['entretien_famille'], ['avertissement_travail', 'Travail']]]);

        $this->assertSame(2, CouncilFollowUp::count());
        $interview = CouncilFollowUp::where('kind', CouncilFollowUp::FAMILY_INTERVIEW)->firstOrFail();
        $this->assertSame($this->principal->id, $interview->owner_id);
        $this->assertSame('todo', $interview->status);
        $this->assertSame('2026-12-20', $interview->due_date->toDateString());
        $this->assertSame(0, app(FollowUpService::class)->createFromDecisions($interview->council), 'Idempotent.');
    }

    public function test_the_owner_follows_up_from_the_teacher_space(): void
    {
        $awa = $this->pupil('Awa');
        $this->closedWith([$awa->id => [['soutien']]]);
        $followUp = CouncilFollowUp::firstOrFail();

        $this->actingAs($this->principal)->get(route('teacher.follow-ups.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/FollowUps')->has('followUps', 1)->where('followUps.0.can_manage', true));

        $this->actingAs($this->principal)->patch(route('teacher.follow-ups.update', $followUp), ['status' => 'done'])->assertSessionHasErrors('comment');
        $this->actingAs($this->principal)->patch(route('teacher.follow-ups.update', $followUp), ['status' => 'done', 'comment' => 'Trois séances faites', 'owner_id' => $this->president->id])
            ->assertSessionHas('success');

        $followUp->refresh();
        $this->assertSame('done', $followUp->status);
        $this->assertNotNull($followUp->completed_at);
        $this->assertSame($this->principal->id, $followUp->owner_id, 'Le responsable ne se dessaisit pas lui-même.');
    }

    public function test_someone_else_cannot_change_the_action(): void
    {
        $awa = $this->pupil('Awa');
        $this->closedWith([$awa->id => [['soutien']]]);
        $followUp = CouncilFollowUp::firstOrFail();

        $this->actingAs($this->teacher('Autre')[0])->patch(route('teacher.follow-ups.update', $followUp), ['status' => 'done', 'comment' => 'x'])->assertForbidden();
        $this->actingAs($this->staff('secretariat'))->patch(route('admin.follow-ups.update', $followUp), ['status' => 'done', 'comment' => 'x'])->assertForbidden();
    }

    public function test_the_pedagogical_manager_lists_and_reassigns(): void
    {
        $this->travelTo(Carbon::parse('2027-02-01 10:00'));
        $awa = $this->pupil('Awa');
        $this->closedWith([$awa->id => [['soutien']]]);
        $followUp = CouncilFollowUp::firstOrFail();
        $followUp->update(['due_date' => '2027-01-15']);

        $this->actingAs($this->president)->get(route('admin.follow-ups.index', ['overdue' => 1]))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/FollowUps/Index')->where('followUps.total', 1)->where('followUps.data.0.overdue', true));
        $this->actingAs($this->president)->get(route('admin.follow-ups.index', ['council_id' => $followUp->council_id]))->assertInertia(fn (Assert $page) => $page
            ->where('followUps.total', 1)->where('filters.council_id', $followUp->council_id));
        $this->actingAs($this->president)->get(route('admin.follow-ups.index', ['council_id' => $followUp->council_id + 99]))->assertInertia(fn (Assert $page) => $page->where('followUps.total', 0));

        $other = $this->staff('vie-scolaire');
        $this->actingAs($this->president)->patch(route('admin.follow-ups.update', $followUp), ['status' => 'in_progress', 'comment' => 'Relais vie scolaire', 'owner_id' => $other->id, 'due_date' => '2027-02-28']);

        $this->assertSame($other->id, $followUp->fresh()->owner_id);
        $this->actingAs($other)->get(route('admin.follow-ups.mine'))->assertInertia(fn (Assert $page) => $page->where('followUps.total', 1));
    }

    public function test_reminders_are_sent_seven_days_before_and_on_the_due_date_once(): void
    {
        Notification::fake();
        $awa = $this->pupil('Awa');
        $this->closedWith([$awa->id => [['soutien']]]);
        $followUp = CouncilFollowUp::firstOrFail();
        $followUp->update(['due_date' => '2027-03-10']);
        $service = app(FollowUpService::class);

        $this->assertSame(0, $service->remind(Carbon::parse('2027-03-02')));
        $this->assertSame(1, $service->remind(Carbon::parse('2027-03-03')));
        $this->assertSame(0, $service->remind(Carbon::parse('2027-03-03')), 'Une seule fois.');
        $this->assertSame(1, $service->remind(Carbon::parse('2027-03-10')));
        Notification::assertSentToTimes($this->principal, PushAlert::class, 2);

        $followUp->update(['status' => 'done', 'reminded_due_at' => null]);
        $this->assertSame(0, $service->remind(Carbon::parse('2027-03-10')), 'Une action réalisée n’est plus rappelée.');
    }

    public function test_the_next_council_shows_the_previous_actions(): void
    {
        $awa = $this->pupil('Awa');
        $first = $this->closedWith([$awa->id => [['soutien']]]);
        $next = $this->openCouncil($this->president, ['term' => 'Semestre 2', 'main_teacher_id' => $this->principal->id]);

        $this->actingAs($this->president)->get(route('council.session.show', $next))->assertInertia(fn (Assert $page) => $page
            ->where('students.0.previous_follow_ups.0.problem', 'Soutien pédagogique')
            ->where('students.0.previous_follow_ups.0.status', 'todo'));
        $this->assertNotSame($first->id, $next->id);
    }
}

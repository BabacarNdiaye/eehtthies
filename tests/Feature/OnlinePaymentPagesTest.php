<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsOnlinePayments;
use Tests\TestCase;

/**
 * Les écrans du paiement en ligne : la page de simulation (un faux fournisseur, jamais accessible hors connexion), la page de
 * suivi où l'on revient après le paiement, et l'écran du personnel qui liste les tentatives et leurs anomalies.
 */
class OnlinePaymentPagesTest extends TestCase
{
    use BuildsOnlinePayments;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpOnlinePayments('simulation');
    }

    /**
     * Un élève ou un parent qui n'a rien à voir avec la tentative. Dans les données de départ ces rôles portent TOUTES les
     * permissions (dont « voir la comptabilité ») : il doit être refusé malgré elles, faute de faire partie du personnel.
     */
    private function stranger(string $role = 'parent'): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    // ───────────── Page de simulation ─────────────

    public function test_the_owner_sees_the_simulation_page_and_a_stranger_does_not(): void
    {
        $attempt = $this->startedAttempt();
        $url = route('payments.simulation.show', $attempt);

        $this->actingAs($this->parentUser)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Payments/Simulation')
            ->where('attempt.reference', $attempt->reference)
            ->where('attempt.amount', 50000)
            ->where('attempt.channel_label', 'Wave')
            ->where('attempt.student_name', 'Awa Diop')
            ->has('attempt.invoices', 2));

        $this->actingAs($this->pupilUser)->get($url)->assertOk();
        $this->actingAs($this->staffActor('voir_comptabilite'))->get($url)->assertOk();
        $this->actingAs($this->stranger())->get($url)->assertForbidden();
        $this->actingAs($this->stranger('eleve'))->get($url)->assertForbidden();
    }

    public function test_a_guest_is_sent_to_the_login_page(): void
    {
        $attempt = $this->startedAttempt();

        $this->get(route('payments.simulation.show', $attempt))->assertRedirect(route('login'));
        $this->get(route('payments.show', $attempt))->assertRedirect(route('login'));
        $this->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success'])->assertRedirect(route('login'));
        $this->assertSame(0, Payment::count());
    }

    public function test_the_simulation_page_exists_only_for_the_simulation_driver(): void
    {
        $attempt = $this->startedAttempt();
        config(['payments.driver' => 'fake']);

        $this->actingAs($this->parentUser)->get(route('payments.simulation.show', $attempt))->assertNotFound();
        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success'])->assertNotFound();
        $this->assertSame(0, Payment::count());
    }

    public function test_a_simulated_success_goes_through_the_signed_notification_and_records_the_payments(): void
    {
        Mail::fake();
        $attempt = $this->startedAttempt();

        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success'])
            ->assertRedirect(route('payments.show', $attempt));

        $this->assertSame('succeeded', $attempt->fresh()->status);
        $this->assertSame(2, Payment::count());
        $this->assertSame(['wave', 'wave'], Payment::orderBy('id')->pluck('channel')->all());
    }

    public function test_a_simulated_failure_marks_the_attempt_failed(): void
    {
        $attempt = $this->startedAttempt();

        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $attempt), ['outcome' => 'failure'])
            ->assertRedirect(route('payments.show', $attempt));

        $this->assertSame('failed', $attempt->fresh()->status);
        $this->assertSame(0, Payment::count());
    }

    public function test_a_stranger_cannot_complete_someone_elses_simulation(): void
    {
        $attempt = $this->startedAttempt();

        $this->actingAs($this->stranger())->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success'])->assertForbidden();

        $this->assertSame('pending', $attempt->fresh()->status);
        $this->assertSame(0, Payment::count());
    }

    public function test_completing_a_simulation_twice_never_pays_twice(): void
    {
        Mail::fake();
        $attempt = $this->startedAttempt();

        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success']);
        $this->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success'])->assertRedirect(route('payments.show', $attempt));

        $this->assertSame(2, Payment::count());
    }

    public function test_the_outcome_must_be_known(): void
    {
        $attempt = $this->startedAttempt();

        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $attempt), ['outcome' => 'bizarre'])->assertSessionHasErrors('outcome');
        $this->assertSame('pending', $attempt->fresh()->status);
    }

    // ───────────── Page de suivi ─────────────

    public function test_the_status_page_follows_the_attempt_until_the_receipt(): void
    {
        Mail::fake();
        $attempt = $this->startedAttempt();

        $this->actingAs($this->parentUser)->get(route('payments.show', $attempt))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Payments/Status')
            ->where('attempt.status', 'pending')
            ->where('attempt.amount', 50000)
            ->where('attempt.resume_url', route('payments.simulation.show', $attempt))
            ->where('attempt.receipt_url', null)
            ->where('attempt.back_url', route('parent.child', ['student' => $this->student, 'tab' => 'factures'], false)));

        $this->post(route('payments.simulation.complete', $attempt), ['outcome' => 'success']);
        $payment = Payment::orderBy('id')->first();

        $this->get(route('payments.show', $attempt))->assertInertia(fn (Assert $page) => $page
            ->where('attempt.status', 'succeeded')
            ->where('attempt.resume_url', null)
            ->where('attempt.receipt_number', $payment->receipt_number)
            ->where('attempt.receipt_url', route('parent.invoices.receipt', [$this->student, $payment->invoice_id, $payment->id], false)));

        $this->actingAs($this->pupilUser)->get(route('payments.show', $attempt))->assertInertia(fn (Assert $page) => $page
            ->where('attempt.receipt_url', route('student.invoices.receipt', [$payment->invoice_id, $payment->id], false))
            ->where('attempt.back_url', route('student.invoices', [], false)));
    }

    public function test_the_status_page_is_private_to_the_family_and_the_accounting_staff(): void
    {
        $attempt = $this->startedAttempt();
        $url = route('payments.show', $attempt);

        $this->actingAs($this->stranger())->get($url)->assertForbidden();
        $this->actingAs($this->staffActor('voir_utilisateurs'))->get($url)->assertForbidden();
        $this->actingAs($this->staffActor('voir_comptabilite'))->get($url)->assertOk();
    }

    public function test_the_review_note_is_for_the_staff_only(): void
    {
        $attempt = $this->startedAttempt();
        $this->webhook(['reference' => $attempt->reference, 'status' => 'succeeded', 'amount' => 25000, 'channel' => 'wave'], driver: 'simulation');

        $this->assertSame('pending', $attempt->fresh()->status, 'sans signature valide la simulation ne reçoit rien');

        $attempt->forceFill(['status' => PaymentAttempt::ANOMALY, 'note' => 'Montant reçu 25 000 FCFA, attendu 50 000 FCFA.'])->save();

        $this->actingAs($this->parentUser)->get(route('payments.show', $attempt))->assertInertia(fn (Assert $page) => $page
            ->where('attempt.status', 'anomaly')->where('attempt.note', null));
        $this->actingAs($this->staffActor('voir_comptabilite'))->get(route('payments.show', $attempt))->assertInertia(fn (Assert $page) => $page
            ->where('attempt.note', 'Montant reçu 25 000 FCFA, attendu 50 000 FCFA.'));
    }

    // ───────────── Écran du personnel ─────────────

    public function test_the_accounting_staff_lists_the_attempts(): void
    {
        $paid = $this->startedAttempt([$this->oct->id], 25000);
        $this->startedAttempt([$this->nov->id], 25000, 'orange_money');
        $this->actingAs($this->parentUser)->post(route('payments.simulation.complete', $paid), ['outcome' => 'success']);

        $this->actingAs($this->staffActor('voir_comptabilite'))->get(route('admin.online-payments.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/OnlinePayments/Index')
            ->where('driver.name', 'simulation')
            ->where('driver.active', true)
            ->where('driver.simulation', true)
            ->has('attempts.data', 2)
            ->where('counts.succeeded', 1)
            ->where('counts.pending', 1)
            ->where('counts.anomaly', 0));
    }

    public function test_the_admin_page_reports_when_no_driver_is_active(): void
    {
        config(['payments.driver' => 'none']);

        $this->actingAs($this->staffActor('voir_comptabilite'))->get(route('admin.online-payments.index'))->assertInertia(fn (Assert $page) => $page
            ->where('driver.active', false)->where('driver.name', 'none')->where('driver.refusal', null));
    }

    public function test_the_admin_page_explains_a_refused_simulation_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->actingAs($this->staffActor('voir_comptabilite'))->get(route('admin.online-payments.index'))->assertInertia(fn (Assert $page) => $page
            ->where('driver.active', false)->where('driver.refusal', fn ($message) => str_contains((string) $message, 'production')));
    }

    public function test_the_admin_page_needs_the_accounting_permission(): void
    {
        $this->actingAs($this->staffActor('voir_utilisateurs'))->get(route('admin.online-payments.index'))->assertForbidden();
        $this->actingAs($this->parentUser)->get(route('admin.online-payments.index'))->assertForbidden();
    }

    public function test_reconciling_needs_the_edit_permission_and_expires_stale_attempts(): void
    {
        $attempt = $this->startedAttempt();
        $this->travel(2)->hours();

        $this->actingAs($this->staffActor('voir_comptabilite'))->post(route('admin.online-payments.reconcile'))->assertForbidden();
        $this->assertSame('pending', $attempt->fresh()->status);

        $this->actingAs($this->staffActor('voir_comptabilite', 'modifier_comptabilite'))->post(route('admin.online-payments.reconcile'))
            ->assertRedirect()->assertSessionHas('success');
        $this->assertSame('expired', $attempt->fresh()->status);
    }
}

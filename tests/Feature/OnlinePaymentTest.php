<?php

namespace Tests\Feature;

use App\Mail\PaymentReceived;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\User;
use App\Notifications\PushAlert;
use App\Payments\GatewayEvent;
use App\Services\PaymentRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsOnlinePayments;
use Tests\Support\FakeGateway;
use Tests\TestCase;

/**
 * Paiement en ligne : un élève ou un parent démarre un paiement de ses propres factures ; rien n'est encaissé avant que le
 * fournisseur le confirme par une notification signée. Cette notification est idempotente (la rejouer ne double rien),
 * et tout ce qui est douteux (montant différent, facture déjà réglée entre-temps) est signalé au personnel au lieu
 * d'être encaissé.
 */
class OnlinePaymentTest extends TestCase
{
    use BuildsOnlinePayments;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpOnlinePayments();
    }

    private function start(array $overrides = [], ?User $as = null)
    {
        return $this->actingAs($as ?? $this->pupilUser)->post(route('student.payments.start'), $overrides + [
            'invoice_ids' => [$this->oct->id, $this->nov->id], 'amount' => 40000, 'channel' => 'wave',
        ]);
    }

    // ───────────── Quand rien n'est configuré ─────────────

    public function test_without_a_driver_there_is_no_online_payment(): void
    {
        config(['payments.driver' => 'none']);

        $this->actingAs($this->pupilUser)->get(route('student.invoices'))->assertInertia(fn (Assert $page) => $page->where('online', null));
        $this->actingAs($this->parentUser)->get(route('parent.child', ['student' => $this->student, 'tab' => 'factures']))
            ->assertInertia(fn (Assert $page) => $page->where('online', null));

        $this->start()->assertNotFound();
        $this->webhook(['reference' => 'X', 'status' => 'succeeded', 'amount' => 1])->assertNotFound();
        $this->assertSame(0, PaymentAttempt::count());
    }

    public function test_only_the_active_driver_accepts_notifications(): void
    {
        $this->webhook(['reference' => 'X', 'status' => 'succeeded', 'amount' => 1], driver: 'simulation')->assertNotFound();
        $this->webhook(['reference' => 'X', 'status' => 'succeeded', 'amount' => 1], driver: 'inconnu')->assertNotFound();
    }

    public function test_the_portals_offer_online_payment_when_a_driver_is_active(): void
    {
        $this->actingAs($this->pupilUser)->get(route('student.invoices'))->assertInertia(fn (Assert $page) => $page
            ->where('online.start_url', route('student.payments.start', [], false))
            ->where('online.channels.wave', 'Wave')
            ->where('online.channels.orange_money', 'Orange Money')
            ->missing('online.channels.especes'));

        $this->actingAs($this->parentUser)->get(route('parent.child', ['student' => $this->student, 'tab' => 'factures']))
            ->assertInertia(fn (Assert $page) => $page->where('online.start_url', route('parent.payments.start', $this->student, false)));
    }

    // ───────────── Démarrer un paiement ─────────────

    public function test_a_student_starts_a_payment_and_is_sent_to_the_provider(): void
    {
        $response = $this->start();

        $attempt = PaymentAttempt::sole();
        $response->assertRedirect('https://pay.example.test/checkout/'.$attempt->reference);

        $this->assertSame('pending', $attempt->status);
        $this->assertSame('fake', $attempt->driver);
        $this->assertSame('wave', $attempt->channel);
        $this->assertEquals(40000, $attempt->amount);
        $this->assertSame($this->student->id, $attempt->student_id);
        $this->assertSame($this->pupilUser->id, $attempt->initiated_by);
        $this->assertSame('FK-'.$attempt->id, $attempt->provider_reference);
        $this->assertSame('https://pay.example.test/checkout/'.$attempt->reference, $attempt->checkout_url);
        $this->assertNotNull($attempt->expires_at);
        $this->assertTrue($attempt->expires_at->equalTo(now()->addMinutes(60)));
        // La somme est répartie sur les plus anciennes échéances d'abord.
        $this->assertEquals([$this->oct->id => 25000, $this->nov->id => 15000], $attempt->allocations);
        $this->assertSame(0, Payment::count(), 'rien n\'est encaissé avant la confirmation du fournisseur');
    }

    public function test_an_inertia_visit_receives_the_provider_address_as_a_location(): void
    {
        $response = $this->actingAs($this->pupilUser)->withHeaders(['X-Inertia' => 'true'])->post(route('student.payments.start'), [
            'invoice_ids' => [$this->oct->id], 'amount' => 25000, 'channel' => 'orange_money',
        ]);

        $response->assertStatus(409)->assertHeader('X-Inertia-Location', 'https://pay.example.test/checkout/'.PaymentAttempt::sole()->reference);
    }

    public function test_a_parent_pays_for_their_own_child_only(): void
    {
        $stranger = $this->makeStudent('Moussa', ['parent_user_id' => User::factory()->create()->id]);
        $payload = ['invoice_ids' => [$this->oct->id], 'amount' => 25000, 'channel' => 'wave'];

        $this->actingAs($this->parentUser)->post(route('parent.payments.start', $this->student), $payload)->assertRedirect();
        $this->post(route('parent.payments.start', $stranger), $payload)->assertForbidden();

        $this->assertSame(1, PaymentAttempt::count());
        $this->assertSame($this->parentUser->id, PaymentAttempt::sole()->initiated_by);
    }

    public function test_each_space_only_opens_its_own_route(): void
    {
        $payload = ['invoice_ids' => [$this->oct->id], 'amount' => 25000, 'channel' => 'wave'];

        $this->actingAs($this->parentUser)->post(route('student.payments.start'), $payload)->assertForbidden();
        $this->actingAs($this->pupilUser)->post(route('parent.payments.start', $this->student), $payload)->assertForbidden();
        $this->assertSame(0, PaymentAttempt::count());
    }

    public function test_the_amount_can_be_partial_but_never_above_the_balance(): void
    {
        $this->start(['invoice_ids' => [$this->oct->id], 'amount' => 10000])->assertRedirect();
        $this->assertEquals([$this->oct->id => 10000], PaymentAttempt::sole()->allocations);

        $this->start(['invoice_ids' => [$this->oct->id], 'amount' => 25001, 'channel' => 'orange_money'])->assertSessionHasErrors('amount');
        $this->start(['amount' => 0])->assertSessionHasErrors('amount');
        $this->start(['amount' => 50001])->assertSessionHasErrors('amount');

        $this->assertSame(1, PaymentAttempt::count());
    }

    public function test_only_open_invoices_of_the_student_can_be_paid(): void
    {
        $stranger = $this->makeStudent('Moussa');
        $foreign = $this->invoiceFor($stranger, 'Mensualité — Octobre', 25000, '2026-10-05');
        app(PaymentRecorder::class)->record($this->student, [$this->nov->id => 25000], 'especes', '2026-10-06');

        $this->start(['invoice_ids' => [$foreign->id], 'amount' => 25000])->assertSessionHasErrors('amount');
        $this->start(['invoice_ids' => [$this->nov->id], 'amount' => 25000])->assertSessionHasErrors('amount');
        $this->start(['invoice_ids' => [], 'amount' => 25000])->assertSessionHasErrors('invoice_ids');

        $this->assertSame(0, PaymentAttempt::count());
    }

    public function test_the_channel_must_be_one_the_driver_supports(): void
    {
        $this->start(['channel' => 'cheque'])->assertSessionHasErrors('amount');
        $this->start(['channel' => 'bitcoin'])->assertSessionHasErrors('amount');

        $this->assertSame(0, PaymentAttempt::count());
    }

    public function test_starting_twice_with_the_same_choice_resumes_the_open_attempt(): void
    {
        $this->start()->assertRedirect();
        $first = PaymentAttempt::sole();

        $this->start()->assertRedirect($first->checkout_url);

        $this->assertSame(1, PaymentAttempt::count());
        $this->assertSame(1, FakeGateway::$initiated);

        // Un autre montant est un autre paiement.
        $this->start(['amount' => 25000, 'invoice_ids' => [$this->oct->id]])->assertRedirect();
        $this->assertSame(2, PaymentAttempt::count());
    }

    public function test_a_provider_failure_is_reported_and_leaves_no_open_attempt(): void
    {
        FakeGateway::$failOnInitiate = true;

        $this->start()->assertSessionHasErrors('amount');

        $attempt = PaymentAttempt::sole();
        $this->assertSame('failed', $attempt->status);
        $this->assertNotNull($attempt->note);
        $this->assertSame(0, Payment::count());
    }

    // ───────────── La notification du fournisseur ─────────────

    public function test_a_signed_success_records_the_payments_and_warns_the_family(): void
    {
        Mail::fake();
        Notification::fake();
        $attempt = $this->startedAttempt();

        $this->webhook($this->success($attempt, providerReference: 'WV-123'))->assertOk()->assertJson(['ok' => true, 'outcome' => 'settled']);

        $attempt->refresh();
        $this->assertSame('succeeded', $attempt->status);
        $this->assertNotNull($attempt->batch_token);
        $this->assertNotNull($attempt->settled_at);

        $payments = Payment::orderBy('id')->get();
        $this->assertCount(2, $payments);
        $this->assertEquals([25000, 25000], $payments->pluck('amount')->map(fn ($amount) => (float) $amount)->all());
        $this->assertSame(['wave', 'wave'], $payments->pluck('channel')->all());
        $this->assertSame(['mobile_money', 'mobile_money'], $payments->pluck('method')->all());
        $this->assertSame(['WV-123', 'WV-123'], $payments->pluck('reference')->all());
        $this->assertSame([$attempt->batch_token, $attempt->batch_token], $payments->pluck('batch_token')->all());
        $this->assertNull($payments->first()->received_by);
        $this->assertStringContainsString($attempt->reference, $payments->first()->notes);
        $this->assertEquals(0, $this->oct->fresh()->balance);

        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('parent@example.test'));
        Notification::assertSentTo($this->parentUser, PushAlert::class);
    }

    public function test_a_replayed_notification_records_nothing_twice(): void
    {
        Mail::fake();
        $attempt = $this->startedAttempt();

        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'settled']);
        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'duplicate']);
        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'duplicate']);

        $this->assertSame(2, Payment::count());
        Mail::assertSent(PaymentReceived::class, 1);
    }

    public function test_a_notification_with_a_bad_signature_is_refused_and_records_nothing(): void
    {
        $attempt = $this->startedAttempt();

        $this->webhook($this->success($attempt), signature: 'pas-la-bonne')->assertUnauthorized();
        $this->webhook($this->success($attempt), signature: hash_hmac('sha256', json_encode($this->success($attempt)), 'autre-cle'))->assertUnauthorized();
        $this->call('POST', route('payments.webhook', 'fake'), [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($this->success($attempt)))->assertUnauthorized();

        $this->assertSame(0, Payment::count());
        $this->assertSame('pending', $attempt->fresh()->status);
    }

    public function test_the_notification_endpoint_needs_no_csrf_token_nor_session(): void
    {
        Mail::fake();
        Notification::fake();
        // Les tests désactivent le contrôle CSRF : on le rétablit pour prouver que cette seule adresse en est exemptée.
        $this->app['env'] = 'local';
        $attempt = $this->startedAttempt();

        // Une requête de fournisseur n'a ni jeton CSRF ni cookie de connexion : la signature en tient lieu.
        $this->webhook($this->success($attempt))->assertOk();
        $this->assertGuest();

        $this->post(route('pages.contact.store'), ['name' => 'Sans jeton'])->assertStatus(419);
    }

    public function test_a_failure_notification_marks_the_attempt_without_recording_anything(): void
    {
        $attempt = $this->startedAttempt();

        $this->webhook(['reference' => $attempt->reference, 'status' => 'failed', 'amount' => 50000, 'provider_reference' => 'WV-9', 'channel' => 'wave'])
            ->assertOk()->assertJson(['outcome' => 'failed']);

        $this->assertSame('failed', $attempt->fresh()->status);
        $this->assertSame(0, Payment::count());
    }

    public function test_a_success_after_a_reported_failure_is_still_recorded(): void
    {
        $attempt = $this->startedAttempt();
        $this->webhook(['reference' => $attempt->reference, 'status' => 'failed', 'amount' => 50000, 'channel' => 'wave'])->assertOk();

        // L'argent a bel et bien été reçu : le dernier mot revient à la confirmation de paiement.
        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'settled']);

        $this->assertSame('succeeded', $attempt->fresh()->status);
        $this->assertSame(2, Payment::count());
    }

    public function test_a_pending_notification_changes_nothing(): void
    {
        $attempt = $this->startedAttempt();

        $this->webhook(['reference' => $attempt->reference, 'status' => 'pending', 'amount' => 50000, 'channel' => 'wave'])
            ->assertOk()->assertJson(['outcome' => 'ignored']);

        $this->assertSame('pending', $attempt->fresh()->status);
    }

    public function test_an_unknown_reference_is_acknowledged_without_any_effect(): void
    {
        $this->webhook(['reference' => 'PAY-INCONNU', 'status' => 'succeeded', 'amount' => 25000, 'channel' => 'wave'])
            ->assertOk()->assertJson(['outcome' => 'unknown']);

        $this->assertSame(0, Payment::count());
    }

    public function test_a_malformed_notification_is_refused(): void
    {
        $this->webhook(['status' => 'succeeded'])->assertStatus(422);
        $this->webhook(['reference' => 'X', 'status' => 'bizarre', 'amount' => 1])->assertStatus(422);
    }

    // ───────────── Ce qui est douteux est signalé, pas encaissé ─────────────

    public function test_a_different_amount_is_flagged_for_review_and_not_recorded(): void
    {
        Notification::fake();
        $accountant = $this->staffActor('voir_comptabilite');
        $attempt = $this->startedAttempt();

        $this->webhook($this->success($attempt, 25000))->assertOk()->assertJson(['outcome' => 'anomaly']);

        $attempt->refresh();
        $this->assertSame('anomaly', $attempt->status);
        $this->assertStringContainsString('25 000', $attempt->note);
        $this->assertSame(0, Payment::count());
        Notification::assertSentTo($accountant, PushAlert::class);
        Notification::assertNotSentTo($this->parentUser, PushAlert::class);
    }

    public function test_an_invoice_settled_elsewhere_in_the_meantime_is_flagged_and_nothing_is_recorded(): void
    {
        Notification::fake();
        $accountant = $this->staffActor('voir_comptabilite');
        $attempt = $this->startedAttempt([$this->oct->id], 25000);
        app(PaymentRecorder::class)->record($this->student, [$this->oct->id => 25000], 'especes', '2026-10-06');

        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'anomaly']);

        $this->assertSame('anomaly', $attempt->fresh()->status);
        $this->assertSame(1, Payment::count(), 'seul l\'encaissement du guichet existe : pas de trop-perçu');
        Notification::assertSentTo($accountant, PushAlert::class);
    }

    public function test_a_flagged_attempt_is_never_settled_by_a_later_notification(): void
    {
        $attempt = $this->startedAttempt();
        $this->webhook($this->success($attempt, 25000))->assertJson(['outcome' => 'anomaly']);

        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'duplicate']);

        $this->assertSame(0, Payment::count());
    }

    public function test_balances_stay_consistent_when_two_attempts_for_one_invoice_are_confirmed(): void
    {
        // Deux paiements ouverts pour la même facture (deux onglets) : le second à être confirmé dépasserait le solde.
        $first = $this->startedAttempt([$this->oct->id], 25000);
        $second = $this->startedAttempt([$this->oct->id], 24000);

        $this->webhook($this->success($first))->assertJson(['outcome' => 'settled']);
        $this->webhook($this->success($second, 24000, 'FK-2'))->assertJson(['outcome' => 'anomaly']);

        $this->assertSame(1, Payment::count());
        $this->assertEquals(0, Invoice::find($this->oct->id)->balance);
    }

    // ───────────── Expiration et réconciliation ─────────────

    public function test_open_attempts_expire_after_their_validity(): void
    {
        $attempt = $this->startedAttempt();

        $this->travel(59)->minutes();
        $this->artisan('app:reconcile-payment-attempts')->assertSuccessful();
        $this->assertSame('pending', $attempt->fresh()->status);

        $this->travel(2)->minutes();
        $this->artisan('app:reconcile-payment-attempts')->assertSuccessful();
        $this->assertSame('expired', $attempt->fresh()->status);
    }

    public function test_a_late_success_for_an_expired_attempt_is_still_recorded(): void
    {
        $attempt = $this->startedAttempt();
        $this->travel(2)->hours();
        $this->artisan('app:reconcile-payment-attempts')->assertSuccessful();
        $this->assertSame('expired', $attempt->fresh()->status);

        // Le payeur a fini par régler : l'argent est là, il doit être enregistré.
        $this->webhook($this->success($attempt))->assertOk()->assertJson(['outcome' => 'settled']);

        $this->assertSame('succeeded', $attempt->fresh()->status);
        $this->assertSame(2, Payment::count());
    }

    public function test_reconciliation_asks_the_provider_about_open_attempts(): void
    {
        $paid = $this->startedAttempt([$this->oct->id], 25000);
        $unknown = $this->startedAttempt([$this->nov->id], 25000, 'orange_money');
        FakeGateway::$statuses[$paid->reference] = new GatewayEvent($paid->reference, GatewayEvent::SUCCEEDED, 25000.0, 'FK-RECON', 'wave');

        $this->artisan('app:reconcile-payment-attempts')->assertSuccessful();

        $this->assertSame('succeeded', $paid->fresh()->status);
        $this->assertSame('pending', $unknown->fresh()->status);
        $this->assertSame(1, Payment::count());
        $this->assertSame('FK-RECON', Payment::sole()->reference);
    }

    public function test_the_reconcile_command_does_nothing_without_a_driver(): void
    {
        $attempt = $this->startedAttempt();
        config(['payments.driver' => 'none']);
        FakeGateway::$statuses[$attempt->reference] = new GatewayEvent($attempt->reference, GatewayEvent::SUCCEEDED, 50000.0, 'FK-X', 'wave');

        $this->artisan('app:reconcile-payment-attempts')->assertSuccessful();

        $this->assertSame(0, Payment::count());
    }

    public function test_the_activity_log_keeps_the_batch_token_and_secrets_out(): void
    {
        $attempt = $this->startedAttempt();
        $this->webhook($this->success($attempt))->assertOk();

        $logged = Activity::all()
            ->map(fn ($entry) => json_encode([$entry->description, $entry->properties, $entry->attribute_changes], JSON_UNESCAPED_UNICODE))
            ->implode(' ');

        $this->assertStringNotContainsString($attempt->fresh()->batch_token, $logged);
        $this->assertStringNotContainsString('test-secret', $logged);
    }
}

<?php

namespace Tests\Feature;

use App\Mail\OverdueInvoiceReminder;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Invoice;
use App\Models\PaymentReminder;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\TestCase;

/**
 * Les relances de paiement partent à des paliers fixes (3, 7, 15, 30 et 60 jours de retard, et en option trois jours
 * avant l'échéance) par e-mail, notification et EEHT Connect. Chaque envoi est journalisé : un palier ne part jamais
 * deux fois, et le personnel peut relancer une famille à la main sans la harceler.
 */
class PaymentReminderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));
    }

    private function parent(string $email = 'parent@example.test'): User
    {
        return User::factory()->create(['email' => $email]);
    }

    private function student(array $attributes = []): Student
    {
        return Student::create($attributes + [
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
        ]);
    }

    /** Facture dont l'échéance est passée de `$daysOverdue` jours (négatif : à venir dans autant de jours). */
    private function invoice(Student $student, int $daysOverdue, float $amount = 25000, string $label = 'Mensualité — Septembre'): Invoice
    {
        return Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => $label, 'amount' => $amount, 'discount' => 0,
            'due_date' => now()->subDays($daysOverdue)->toDateString(),
        ]);
    }

    private function remind(): string
    {
        Artisan::call('app:send-overdue-invoice-reminders');

        return Artisan::output();
    }

    /** @return list<string> titres des notifications reçues par ce compte */
    private function pushTitles(User $user): array
    {
        return Notification::sent($user, PushAlert::class)
            ->map(fn (PushAlert $alert) => $alert->toWebPush($user, $alert)->toArray()['title'])
            ->values()
            ->all();
    }

    private function assistantMessages(User $user)
    {
        $conversation = Conversation::where('type', Conversation::TYPE_ASSISTANT)->forUser($user->id)->first();

        return $conversation
            ? $conversation->messages()->where('kind', ConversationMessage::KIND_SYSTEM)->get()
            : collect();
    }

    private function staff(string $role = 'caissier'): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    // ───────────── Relances automatiques ─────────────

    public function test_a_milestone_reminder_reaches_the_family_by_mail_push_and_connect_and_is_logged(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = $this->parent();
        $student = $this->student(['parent_user_id' => $parent->id]);
        $invoice = $this->invoice($student, 7);

        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, fn (OverdueInvoiceReminder $mail) => $mail->hasTo('parent@example.test') && ! $mail->upcoming);
        $this->assertSame(['Rappel de paiement'], $this->pushTitles($parent));

        $messages = $this->assistantMessages($parent);
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('1 facture en retard', $messages->first()->body);
        $this->assertStringContainsString('25 000 FCFA', $messages->first()->body);

        $row = PaymentReminder::sole();
        $this->assertSame($invoice->id, $row->invoice_id);
        $this->assertSame($student->id, $row->student_id);
        $this->assertSame('auto', $row->kind);
        $this->assertSame(7, $row->milestone);
        $this->assertSame(7, $row->days_overdue);
        $this->assertEquals(25000, $row->balance);
        $this->assertEqualsCanonicalizing(['mail', 'push', 'connect'], $row->channels);
        $this->assertNull($row->sent_by);
    }

    public function test_the_notification_shows_no_amount_on_the_lock_screen(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = $this->parent();
        $this->invoice($this->student(['parent_user_id' => $parent->id]), 7);

        $this->remind();

        Notification::assertSentTo($parent, PushAlert::class, function (PushAlert $alert) use ($parent) {
            $message = $alert->toWebPush($parent, $alert)->toArray();

            return ! str_contains($message['body'], 'FCFA') && str_contains($message['body'], 'Awa') && $message['data']['url'] !== '/';
        });
    }

    public function test_a_milestone_never_goes_out_twice(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = $this->parent();
        $this->invoice($this->student(['parent_user_id' => $parent->id]), 7);

        $this->remind();
        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        $this->assertCount(1, $this->pushTitles($parent));
        $this->assertSame(1, PaymentReminder::count());
    }

    public function test_each_milestone_goes_out_once_as_the_invoice_ages(): void
    {
        Mail::fake();
        Notification::fake();
        $this->invoice($this->student(['parent_user_id' => $this->parent()->id]), 3);

        $this->remind();
        $this->travelTo(now()->addDays(4));
        $this->remind();
        $this->travelTo(now()->addDay());
        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, 2);
        $this->assertSame([3, 7], PaymentReminder::orderBy('milestone')->pluck('milestone')->all());
    }

    public function test_invoices_listed_without_hitting_a_milestone_are_logged_without_one(): void
    {
        Mail::fake();
        Notification::fake();
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $atMilestone = $this->invoice($student, 7, 10000, 'Mensualité — Septembre');
        $between = $this->invoice($student, 20, 15000, 'Mensualité — Août');

        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        Mail::assertSent(OverdueInvoiceReminder::class, fn (OverdueInvoiceReminder $mail) => $mail->totalDue === 25000.0 && $mail->invoices->count() === 2);
        $this->assertSame(7, PaymentReminder::where('invoice_id', $atMilestone->id)->sole()->milestone);
        $this->assertNull(PaymentReminder::where('invoice_id', $between->id)->sole()->milestone);
        $this->assertSame(20, PaymentReminder::where('invoice_id', $between->id)->sole()->days_overdue);
    }

    public function test_nobody_to_reach_sends_nothing_logs_nothing_and_is_counted(): void
    {
        Mail::fake();
        Notification::fake();
        $this->invoice($this->student(), 7);

        $output = $this->remind();

        Mail::assertNothingSent();
        Notification::assertNothingSent();
        $this->assertSame(0, PaymentReminder::count());
        $this->assertStringContainsString('Sans contact : 1', $output);
    }

    public function test_settled_invoices_and_inactive_students_are_left_alone(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = $this->parent();
        $paid = $this->invoice($this->student(['parent_user_id' => $parent->id]), 7);
        $paid->payments()->create(['amount' => 25000, 'method' => 'especes', 'paid_at' => now()]);
        $this->invoice($this->student(['parent_user_id' => $parent->id, 'status' => 'abandon']), 7);

        $this->remind();

        Mail::assertNothingSent();
        $this->assertSame(0, PaymentReminder::count());
    }

    public function test_a_failing_channel_never_blocks_the_others_and_is_not_logged(): void
    {
        Notification::fake();
        $parent = $this->parent();
        $this->invoice($this->student(['parent_user_id' => $parent->id]), 7);
        Mail::shouldReceive('to')->andThrow(new RuntimeException('Serveur de courrier injoignable'));

        $this->remind();

        $this->assertSame(['Rappel de paiement'], $this->pushTitles($parent));
        $this->assertCount(1, $this->assistantMessages($parent));
        $this->assertEqualsCanonicalizing(['push', 'connect'], PaymentReminder::sole()->channels);
    }

    // ───────────── Rappel avant l'échéance (en option) ─────────────

    public function test_the_reminder_before_the_due_date_is_off_by_default(): void
    {
        Mail::fake();
        Notification::fake();
        $this->invoice($this->student(['parent_user_id' => $this->parent()->id]), -3);

        $this->remind();

        Mail::assertNothingSent();
        $this->assertSame(0, PaymentReminder::count());
    }

    public function test_the_reminder_before_the_due_date_goes_out_three_days_ahead_once_when_enabled(): void
    {
        Mail::fake();
        Notification::fake();
        Setting::set('finance_remind_before_due', '1', 'finance');
        $inThree = $this->invoice($this->student(['parent_user_id' => $this->parent('a@example.test')->id]), -3);
        $this->invoice($this->student(['parent_user_id' => $this->parent('b@example.test')->id]), -2);
        $paid = $this->invoice($this->student(['parent_user_id' => $this->parent('c@example.test')->id]), -3);
        $paid->payments()->create(['amount' => 25000, 'method' => 'especes', 'paid_at' => now()]);

        $this->remind();
        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        Mail::assertSent(OverdueInvoiceReminder::class, function (OverdueInvoiceReminder $mail) use ($inThree) {
            return $mail->hasTo('a@example.test')
                && $mail->upcoming
                && $mail->invoices->pluck('id')->all() === [$inThree->id]
                && str_contains($mail->envelope()->subject, 'Échéance proche')
                && str_contains($mail->render(), 'arrive à échéance');
        });

        $row = PaymentReminder::sole();
        $this->assertSame(-3, $row->milestone);
        $this->assertSame(-3, $row->days_overdue);
        $this->assertSame('auto', $row->kind);
    }

    public function test_an_overdue_reminder_replaces_the_one_before_the_due_date_the_same_day(): void
    {
        Mail::fake();
        Notification::fake();
        Setting::set('finance_remind_before_due', '1', 'finance');
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $this->invoice($student, 7, 10000, 'Mensualité — Septembre');
        $this->invoice($student, -3, 25000, 'Mensualité — Octobre');

        $this->remind();

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        Mail::assertSent(OverdueInvoiceReminder::class, fn (OverdueInvoiceReminder $mail) => ! $mail->upcoming && $mail->invoices->count() === 1);
    }

    // ───────────── Relance manuelle ─────────────

    public function test_staff_can_remind_a_family_by_hand_and_it_is_logged_with_their_name(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = $this->parent();
        $student = $this->student(['parent_user_id' => $parent->id]);
        $this->invoice($student, 12, 25000, 'Mensualité — Septembre');
        $this->invoice($student, -10, 25000, 'Mensualité — Octobre'); // à venir : n'entre pas dans la relance
        $staff = $this->staff();

        $this->actingAs($staff)->post(route('admin.invoices.remind'), ['student_id' => $student->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        Mail::assertSent(OverdueInvoiceReminder::class, fn (OverdueInvoiceReminder $mail) => $mail->invoices->count() === 1 && $mail->hasTo('parent@example.test'));
        $this->assertSame(['Rappel de paiement'], $this->pushTitles($parent));

        $row = PaymentReminder::sole();
        $this->assertSame('manual', $row->kind);
        $this->assertNull($row->milestone);
        $this->assertSame(12, $row->days_overdue);
        $this->assertSame($staff->id, $row->sent_by);
        $this->assertEqualsCanonicalizing(['mail', 'push', 'connect'], $row->channels);
    }

    public function test_a_manual_reminder_is_refused_twice_within_a_day_but_allowed_the_next_day(): void
    {
        Mail::fake();
        Notification::fake();
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $this->invoice($student, 12);
        $staff = $this->staff();

        $this->actingAs($staff)->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('success');
        $this->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('error');

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        $this->assertSame(1, PaymentReminder::count());

        $this->travelTo(now()->addHours(25));
        $this->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('success');

        Mail::assertSent(OverdueInvoiceReminder::class, 2);
    }

    public function test_an_automatic_reminder_counts_for_the_daily_limit_of_manual_ones(): void
    {
        Mail::fake();
        Notification::fake();
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $this->invoice($student, 7);
        $this->remind();

        $this->actingAs($this->staff())->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('error');

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
    }

    public function test_a_manual_reminder_needs_an_overdue_invoice(): void
    {
        Mail::fake();
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $this->invoice($student, -5); // pas encore échue

        $this->actingAs($this->staff())->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('error');

        Mail::assertNothingSent();
        $this->assertSame(0, PaymentReminder::count());
    }

    public function test_a_manual_reminder_without_any_contact_is_refused_and_not_logged(): void
    {
        Mail::fake();
        $student = $this->student();
        $this->invoice($student, 12);

        $this->actingAs($this->staff())->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertSessionHas('error');

        Mail::assertNothingSent();
        $this->assertSame(0, PaymentReminder::count());
    }

    public function test_a_manual_reminder_needs_the_permission_to_edit_accounting(): void
    {
        Mail::fake();
        $student = $this->student(['parent_user_id' => $this->parent()->id]);
        $this->invoice($student, 12);
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('voir_comptabilite');

        $this->actingAs($viewer)->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertForbidden();
        $this->actingAs($this->staff('responsable-stocks'))->post(route('admin.invoices.remind'), ['student_id' => $student->id])->assertForbidden();

        Mail::assertNothingSent();
    }
}

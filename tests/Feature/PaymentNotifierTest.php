<?php

namespace Tests\Feature;

use App\Mail\PaymentReceived;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use App\Notifications\PushAlert;
use App\Services\PaymentNotifier;
use App\Services\PaymentRecorder;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\TestCase;

/**
 * La famille apprend l'encaissement par e-mail (avec le reçu en PDF), par notification et dans EEHT Connect. Un canal
 * qui échoue (serveur de courrier en panne, abonnement push expiré) ne doit jamais empêcher les autres ni faire
 * échouer l'encaissement.
 */
class PaymentNotifierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    private function student(array $attributes = []): Student
    {
        return Student::create($attributes + [
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
        ]);
    }

    private function batch(Student $student, float $amount = 25000): Collection
    {
        $invoice = Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité — Octobre', 'amount' => $amount, 'discount' => 0,
        ]);

        return app(PaymentRecorder::class)->record($student, [$invoice->id => $amount], 'wave', '2026-10-06', 'WV-1');
    }

    private function assistantMessages(User $user)
    {
        $conversation = Conversation::where('type', Conversation::TYPE_ASSISTANT)->forUser($user->id)->first();

        return $conversation
            ? $conversation->messages()->where('kind', ConversationMessage::KIND_SYSTEM)->get()
            : collect();
    }

    public function test_contacts_are_reported_before_anything_is_sent(): void
    {
        $parent = User::factory()->create();
        $family = $this->student(['parent_user_id' => $parent->id]);
        $guardian = $this->student(['guardian_email' => 'tuteur@example.test']);
        $nobody = $this->student();
        $notifier = app(PaymentNotifier::class);

        $this->assertSame(['mail' => true, 'push' => true, 'connect' => true], $notifier->contactsFor($family));
        $this->assertSame(['mail' => true, 'push' => false, 'connect' => false], $notifier->contactsFor($guardian));
        $this->assertSame(['mail' => false, 'push' => false, 'connect' => false], $notifier->contactsFor($nobody));
    }

    public function test_the_receipt_reaches_the_parent_by_mail_push_and_connect(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = User::factory()->create(['email' => 'parent@example.test']);
        $payments = $this->batch($this->student(['parent_user_id' => $parent->id]));

        $channels = app(PaymentNotifier::class)->receipt($payments);

        $this->assertEqualsCanonicalizing(['mail', 'push', 'connect'], $channels);
        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('parent@example.test'));
        Notification::assertSentTo($parent, PushAlert::class);

        $messages = $this->assistantMessages($parent);
        $this->assertCount(1, $messages);
        $this->assertStringContainsString($payments->first()->receipt_number, $messages->first()->body);
    }

    public function test_the_student_account_is_notified_too(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = User::factory()->create(['email' => 'parent@example.test']);
        $pupil = User::factory()->create();
        $payments = $this->batch($this->student(['parent_user_id' => $parent->id, 'user_id' => $pupil->id]));

        app(PaymentNotifier::class)->receipt($payments);

        Notification::assertSentTo($pupil, PushAlert::class);
        $this->assertCount(1, $this->assistantMessages($pupil));
        Mail::assertSent(PaymentReceived::class, 1);
    }

    public function test_the_mail_falls_back_to_the_guardian_then_to_the_student_address(): void
    {
        Mail::fake();
        Notification::fake();

        app(PaymentNotifier::class)->receipt($this->batch($this->student(['guardian_email' => 'tuteur@example.test', 'email' => 'eleve@example.test'])));
        app(PaymentNotifier::class)->receipt($this->batch($this->student(['email' => 'seul@example.test'])));

        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('tuteur@example.test'));
        Mail::assertNotSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('eleve@example.test'));
        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('seul@example.test'));
    }

    public function test_the_mail_lists_the_invoices_and_attaches_the_receipt_pdf(): void
    {
        Mail::fake();
        Notification::fake();
        $parent = User::factory()->create(['email' => 'parent@example.test']);
        $payments = $this->batch($this->student(['parent_user_id' => $parent->id]), 25000);

        app(PaymentNotifier::class)->receipt($payments);

        Mail::assertSent(PaymentReceived::class, function (PaymentReceived $mail) use ($payments) {
            $html = $mail->render();

            return str_contains($html, 'Mensualité — Octobre')
                && str_contains($html, $payments->first()->receipt_number)
                && str_contains($html, '25 000')
                && count($mail->attachments()) === 1;
        });
    }

    public function test_a_failing_channel_never_blocks_the_others(): void
    {
        Notification::fake();
        $parent = User::factory()->create(['email' => 'parent@example.test']);
        $payments = $this->batch($this->student(['parent_user_id' => $parent->id]));

        Mail::shouldReceive('to')->andThrow(new RuntimeException('Serveur de courrier injoignable'));

        $channels = app(PaymentNotifier::class)->receipt($payments);

        $this->assertNotContains('mail', $channels);
        $this->assertContains('push', $channels);
        $this->assertContains('connect', $channels);
        Notification::assertSentTo($parent, PushAlert::class);
        $this->assertCount(1, $this->assistantMessages($parent));
    }

    public function test_nobody_to_notify_sends_nothing_and_does_not_fail(): void
    {
        Mail::fake();
        Notification::fake();

        $channels = app(PaymentNotifier::class)->receipt($this->batch($this->student()));

        $this->assertSame([], $channels);
        Mail::assertNothingSent();
        Notification::assertNothingSent();
    }
}

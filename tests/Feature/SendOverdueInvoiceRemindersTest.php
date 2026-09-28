<?php

namespace Tests\Feature;

use App\Mail\OverdueInvoiceReminder;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Regression coverage for two real bugs caught before this command ever
 * reached production: Carbon::diffInDays() returns a *negative* count when
 * the reference date is in the past relative to the date being compared
 * against (so the naive call always missed every overdue invoice), and even
 * with `absolute: true` it returns a float, which silently fails a strict
 * in_array() milestone check against an array of ints. Both are pinned down
 * here so neither can quietly regress.
 */
class SendOverdueInvoiceRemindersTest extends TestCase
{
    use RefreshDatabase;

    private function makeStudentWithParentEmail(string $email = 'parent@example.com'): Student
    {
        $parent = User::factory()->create(['email' => $email]);

        return Student::create([
            'matricule' => 'TEST-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Test',
            'status' => 'actif',
            'parent_user_id' => $parent->id,
        ]);
    }

    private function makeOverdueInvoice(Student $student, int $daysOverdue, float $amount = 25000): Invoice
    {
        return Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité',
            'amount' => $amount,
            'discount' => 0,
            'due_date' => now()->subDays($daysOverdue)->toDateString(),
        ]);
    }

    public function test_sends_a_reminder_exactly_on_the_3_day_milestone(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->makeOverdueInvoice($student, 3);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertSent(OverdueInvoiceReminder::class, fn ($mail) => $mail->student->is($student));
    }

    public function test_sends_a_reminder_exactly_on_the_30_day_milestone(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->makeOverdueInvoice($student, 30);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertSent(OverdueInvoiceReminder::class, fn ($mail) => $mail->student->is($student));
    }

    public function test_does_not_send_a_reminder_on_a_non_milestone_day(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->makeOverdueInvoice($student, 4); // 4 is not in [3,7,15,30,60]

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertNothingSent();
    }

    public function test_does_not_send_a_reminder_for_an_invoice_that_is_not_yet_due(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 25000, 'discount' => 0, 'due_date' => now()->addDays(3)->toDateString(),
        ]);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertNothingSent();
    }

    public function test_does_not_send_a_reminder_for_a_fully_paid_invoice(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $invoice = $this->makeOverdueInvoice($student, 7);
        $invoice->payments()->create(['amount' => 25000, 'method' => 'especes', 'paid_at' => now()]);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertNothingSent();
    }

    public function test_groups_multiple_overdue_invoices_for_the_same_student_into_one_email(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->makeOverdueInvoice($student, 7, 10000);
        $this->makeOverdueInvoice($student, 20, 15000); // not a milestone itself, but still included once the other triggers

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertSent(OverdueInvoiceReminder::class, 1);
        Mail::assertSent(OverdueInvoiceReminder::class, fn ($mail) => $mail->totalDue === 25000.0 && $mail->invoices->count() === 2);
    }

    public function test_prefers_the_parent_portal_account_email_over_the_guardian_contact_email(): void
    {
        Mail::fake();
        $parent = User::factory()->create(['email' => 'portal-parent@example.com']);
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'status' => 'actif', 'parent_user_id' => $parent->id, 'guardian_email' => 'guardian-contact@example.com',
        ]);
        $this->makeOverdueInvoice($student, 3);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertSent(OverdueInvoiceReminder::class, function ($mail) {
            return $mail->hasTo('portal-parent@example.com');
        });
    }

    public function test_falls_back_to_the_guardian_email_when_there_is_no_parent_portal_account(): void
    {
        Mail::fake();
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'status' => 'actif', 'guardian_email' => 'guardian-only@example.com',
        ]);
        $this->makeOverdueInvoice($student, 3);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertSent(OverdueInvoiceReminder::class, fn ($mail) => $mail->hasTo('guardian-only@example.com'));
    }

    public function test_skips_a_student_with_no_contact_email_at_all(): void
    {
        Mail::fake();
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif',
        ]);
        $this->makeOverdueInvoice($student, 3);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertNothingSent();
    }

    public function test_ignores_overdue_invoices_belonging_to_inactive_students(): void
    {
        Mail::fake();
        $parent = User::factory()->create(['email' => 'parent@example.com']);
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Ancien', 'last_name' => 'Eleve',
            'status' => 'abandon', 'parent_user_id' => $parent->id,
        ]);
        $this->makeOverdueInvoice($student, 3);

        Artisan::call('app:send-overdue-invoice-reminders');

        Mail::assertNothingSent();
    }
}

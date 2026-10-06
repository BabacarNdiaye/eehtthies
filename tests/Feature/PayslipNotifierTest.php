<?php

namespace Tests\Feature;

use App\Mail\PayslipAvailable;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\SalaryPayment;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * Quand un salaire est versé, la personne en est avertie (e-mail, notification, EEHT Connect) : « votre bulletin est
 * disponible ». Jamais de montant ni de numéro de compte dans ces messages, qui s'affichent sur un écran verrouillé ou
 * dans une boîte de réception : le détail se lit dans « Ma paie », après connexion.
 */
class PayslipNotifierTest extends TestCase
{
    use BuildsPayroll;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-31 18:00:00'));
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
    }

    private function payEveryone(): void
    {
        $run = $this->prepareRun($this->admin);
        $this->post(route('admin.payroll.validate', $run))->assertSessionHas('success');
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('success');
    }

    private function assistantMessages(User $user)
    {
        $conversation = Conversation::where('type', Conversation::TYPE_ASSISTANT)->forUser($user->id)->first();

        return $conversation
            ? $conversation->messages()->where('kind', ConversationMessage::KIND_SYSTEM)->get()
            : collect();
    }

    public function test_paying_a_staff_member_tells_them_by_mail_push_and_connect_without_any_amount(): void
    {
        Mail::fake();
        Notification::fake();
        $awa = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['email' => 'awa@example.test', 'payout_account' => 'SECRET-ACCOUNT-1']);

        $this->payEveryone();

        Mail::assertSent(PayslipAvailable::class, function (PayslipAvailable $mail) {
            $html = $mail->render();

            return $mail->hasTo('awa@example.test')
                && str_contains($html, 'Octobre 2026')
                && str_contains($html, 'Ma paie')
                && ! str_contains($html, 'FCFA')
                && ! str_contains($html, '250 000')
                && ! str_contains($html, 'SECRET-ACCOUNT-1');
        });

        Notification::assertSentTo($awa, PushAlert::class, function (PushAlert $alert) use ($awa) {
            $message = $alert->toWebPush($awa, $alert)->toArray();

            return $message['title'] === 'Bulletin de paie disponible'
                && ! str_contains($message['body'], 'FCFA')
                && str_contains($message['data']['url'], '/ma-paie');
        });

        $messages = $this->assistantMessages($awa);
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('Ma paie', $messages->first()->body);
        $this->assertStringNotContainsString('FCFA', $messages->first()->body);
        $this->assertStringNotContainsString('SECRET-ACCOUNT-1', $messages->first()->body);
    }

    public function test_a_teacher_with_an_account_is_told_in_the_teacher_portal(): void
    {
        Mail::fake();
        Notification::fake();
        $account = User::factory()->create(['email' => 'fatou@example.test']);
        $account->assignRole('enseignant');
        $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['user_id' => $account->id]);

        $this->payEveryone();

        Mail::assertSent(PayslipAvailable::class, fn (PayslipAvailable $mail) => $mail->hasTo('fatou@example.test'));
        Notification::assertSentTo($account, PushAlert::class, fn (PushAlert $alert) => str_contains($alert->toWebPush($account, $alert)->toArray()['data']['url'], '/espace-enseignant/ma-paie'));
        $this->assertCount(1, $this->assistantMessages($account));
    }

    public function test_a_teacher_without_an_account_only_gets_a_mail(): void
    {
        Mail::fake();
        Notification::fake();
        $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['professional_email' => 'fatou.ba@eeht-thies.sn']);

        $this->payEveryone();

        Mail::assertSent(PayslipAvailable::class, fn (PayslipAvailable $mail) => $mail->hasTo('fatou.ba@eeht-thies.sn'));
        Notification::assertNothingSent();
    }

    public function test_a_failing_channel_never_blocks_the_payment_or_the_other_channels(): void
    {
        Notification::fake();
        $awa = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['email' => 'awa@example.test']);
        Mail::shouldReceive('to')->andThrow(new RuntimeException('Serveur de courrier injoignable'));

        $this->payEveryone();

        $this->assertSame(1, SalaryPayment::count());
        Notification::assertSentTo($awa, PushAlert::class);
        $this->assertCount(1, $this->assistantMessages($awa));
    }

    public function test_each_person_is_told_once_even_if_paying_is_attempted_again(): void
    {
        Mail::fake();
        Notification::fake();
        $this->payrollStaff('Awa Sow', 250000, 'comptable', ['email' => 'awa@example.test']);
        $this->payrollStaff('Ndeye Fall', 200000, 'comptable', ['email' => 'ndeye@example.test']);

        $run = $this->prepareRun($this->admin);
        $this->post(route('admin.payroll.validate', $run));
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement']);
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement']);

        Mail::assertSent(PayslipAvailable::class, 2);
    }
}

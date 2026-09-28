<?php

namespace Tests\Feature;

use App\Mail\ResetPassword;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * The stock Laravel password-reset e-mail uses the framework's generic,
 * unbranded template. This app overrides User::sendPasswordResetNotification()
 * to send our own branded Mailable (mail.layout) instead — this pins that
 * override down so it can't silently regress back to the default template.
 *
 * Note: notifications whose toMail() returns a Mailable bypass the `Mail`
 * facade (MailChannel calls $mailable->send() on an injected Mailer contract
 * directly), so Mail::fake()/Mail::assertSent() never sees them — confirmed
 * by testing both ways before settling on this. Notification::fake() is the
 * correct tool here regardless of what channel/mechanism is used internally.
 */
class ResetPasswordEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_dispatches_our_custom_notification_with_the_right_token_and_email(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'awa@example.com']);

        $user->sendPasswordResetNotification('a-real-looking-token');

        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification, $channels) use ($user) {
            $mail = $notification->toMail($user);

            return $mail instanceof ResetPassword
                && $mail->hasTo($user->email)
                && str_contains($mail->url, 'a-real-looking-token')
                && str_contains($mail->url, urlencode($user->email));
        });
    }

    public function test_the_reset_link_points_to_the_password_reset_route(): void
    {
        $user = User::factory()->create();

        $mail = new ResetPassword(route('password.reset', ['token' => 'xyz', 'email' => $user->email]), $user->name);
        $html = $mail->render();

        $this->assertStringContainsString(route('password.reset', ['token' => 'xyz', 'email' => $user->email]), $html);
        $this->assertStringContainsString('Réinitialiser mon mot de passe', $html);
    }

    public function test_the_full_public_forgot_password_flow_dispatches_our_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'parent@example.com']);

        $this->post('/forgot-password', ['email' => 'parent@example.com'])
            ->assertSessionHasNoErrors();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }
}

<?php

namespace Tests\Feature;

use App\Mail\ResetPassword;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * L'e-mail standard de réinitialisation de mot de passe de Laravel utilise le gabarit générique du framework,
 * sans la marque. Cette application surcharge User::sendPasswordResetNotification() pour envoyer à la place
 * notre propre Mailable à la marque de l'école (mail.layout) — ce test verrouille cette surcharge pour
 * qu'elle ne régresse pas silencieusement vers le gabarit par défaut.
 *
 * Remarque : les notifications dont toMail() renvoie un Mailable contournent la façade `Mail` (MailChannel
 * appelle directement $mailable->send() sur un contrat Mailer injecté), donc Mail::fake() et
 * Mail::assertSent() ne les voient jamais — confirmé en testant dans les deux sens avant de retenir cette
 * solution. Notification::fake() est ici le bon outil, quel que soit le canal ou le mécanisme utilisé en
 * interne.
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

<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ResetPassword extends Mailable
{
    use Queueable;

    public function __construct(
        public string $url,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Réinitialisation de votre mot de passe',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.reset_password',
            with: [
                'url' => $this->url,
                'recipientName' => $this->recipientName,
                'expireMinutes' => config('auth.passwords.users.expire', 60),
            ],
        );
    }
}

<?php

namespace App\Mail;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeStudent extends Mailable
{
    use Queueable;

    public function __construct(
        public Student $student,
        public string $password,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenue — votre espace élève est prêt',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.welcome_student',
            with: [
                'student' => $this->student,
                'password' => $this->password,
                'loginUrl' => route('login'),
            ],
        );
    }
}

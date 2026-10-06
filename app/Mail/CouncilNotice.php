<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Message du conseil de classe (convocation, rappel du pré-conseil) : quelques lignes et un lien vers l'espace. Jamais de
 * note, d'observation ni de décision dans le corps : le détail se lit après connexion.
 */
class CouncilNotice extends Mailable
{
    use Queueable;

    /** @param  list<string>  $lines */
    public function __construct(
        public string $subjectLine,
        public string $eyebrow,
        public string $greeting,
        public array $lines,
        public string $actionLabel,
        public string $actionUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.council_notice');
    }
}

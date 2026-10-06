<?php

namespace App\Mail;

use App\Models\Candidature;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class CandidatureFollowup extends Mailable
{
    use Queueable;

    public function __construct(
        public Candidature $candidature,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->candidature->status === 'dossier_incomplet'
            ? 'Votre dossier de candidature est incomplet'
            : 'Terminez votre candidature';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.candidature_followup',
            with: ['candidature' => $this->candidature],
        );
    }
}

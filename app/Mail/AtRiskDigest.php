<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class AtRiskDigest extends Mailable
{
    use Queueable;

    public function __construct(
        public Collection $students,
        public array $summary,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Élèves à risque — {$this->summary['total']} signalé(s) cette semaine",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.at_risk_digest',
            with: [
                'students' => $this->students,
                'summary' => $this->summary,
                'recipientName' => $this->recipientName,
            ],
        );
    }
}

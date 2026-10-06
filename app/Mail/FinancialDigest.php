<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class FinancialDigest extends Mailable
{
    use Queueable;

    public function __construct(
        public array $data,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bilan financier — {$this->data['monthLabel']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.financial_digest',
            with: [
                'data' => $this->data,
                'recipientName' => $this->recipientName,
            ],
        );
    }
}

<?php

namespace App\Mail;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PaymentReceived extends Mailable
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $receipt  données du reçu (voir App\Support\Receipt::viewData)
     * @param  string|null  $pdf  le reçu en PDF, joint au message quand il a pu être fabriqué
     */
    public function __construct(
        public Student $student,
        public array $receipt,
        public ?string $pdf = null,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Reçu de paiement — {$this->student->full_name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.payment_received',
            with: [
                'student' => $this->student,
                'receipt' => $this->receipt,
                'recipientName' => $this->recipientName,
            ],
        );
    }

    public function attachments(): array
    {
        if ($this->pdf === null) {
            return [];
        }

        return [
            Attachment::fromData(fn () => $this->pdf, 'recu-'.$this->receipt['primary']->receipt_number.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}

<?php

namespace App\Mail;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class OverdueInvoiceReminder extends Mailable
{
    use Queueable;

    public function __construct(
        public Student $student,
        public Collection $invoices,
        public float $totalDue,
        public ?string $recipientName = null,
        /** Rappel envoyé avant l'échéance (en option) plutôt qu'une relance de retard. */
        public bool $upcoming = false,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: ($this->upcoming ? 'Échéance proche' : 'Rappel de paiement')." — {$this->student->full_name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.overdue_invoice_reminder',
            with: [
                'student' => $this->student,
                'invoices' => $this->invoices,
                'totalDue' => $this->totalDue,
                'recipientName' => $this->recipientName,
                'upcoming' => $this->upcoming,
            ],
        );
    }
}

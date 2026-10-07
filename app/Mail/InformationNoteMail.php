<?php

namespace App\Mail;

use App\Models\InformationNote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Note d'information de la Direction, envoyée avec son PDF (papier à en-tête) en pièce jointe. */
class InformationNoteMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public InformationNote $note) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Note d'information N° {$this->note->reference} — {$this->note->subject}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.information_note', with: ['note' => $this->note]);
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->note->pdfContent(), 'note-information-'.str_pad((string) $this->note->number, 6, '0', STR_PAD_LEFT).'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}

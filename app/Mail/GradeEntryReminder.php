<?php

namespace App\Mail;

use App\Models\Exam;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class GradeEntryReminder extends Mailable
{
    use Queueable;

    public function __construct(
        public Exam $exam,
        public int $missingCount,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Notes à saisir — {$this->exam->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.grade_entry_reminder',
            with: [
                'exam' => $this->exam,
                'missingCount' => $this->missingCount,
            ],
        );
    }
}

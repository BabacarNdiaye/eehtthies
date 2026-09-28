<?php

namespace App\Mail;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class AbsenceAlert extends Mailable
{
    use Queueable;

    public function __construct(
        public Student $student,
        public int $totalUnjustified,
        public Collection $recentAbsences,
        public ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Absences non justifiées — {$this->student->full_name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.absence_alert',
            with: [
                'student' => $this->student,
                'totalUnjustified' => $this->totalUnjustified,
                'recentAbsences' => $this->recentAbsences,
                'recipientName' => $this->recipientName,
            ],
        );
    }
}

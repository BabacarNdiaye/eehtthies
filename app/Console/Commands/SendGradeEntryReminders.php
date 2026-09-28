<?php

namespace App\Console\Commands;

use App\Mail\GradeEntryReminder;
use App\Models\Exam;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendGradeEntryReminders extends Command
{
    protected $signature = 'app:send-grade-entry-reminders';

    protected $description = "Rappelle par e-mail à l'enseignant responsable qu'une épreuve n'a pas encore toutes ses notes saisies, à des paliers fixes (3, 7 jours après la date de l'épreuve).";

    private const MILESTONES = [3, 7];

    public function handle(): int
    {
        $today = Carbon::today();

        $candidateExams = Exam::with(['invigilators.user', 'creator', 'subject:id,name', 'schoolClass:id,name'])
            ->whereDate('exam_date', '<', $today)
            ->withCount('grades')
            ->get()
            ->filter(fn (Exam $exam) => in_array((int) $today->diffInDays($exam->exam_date, absolute: true), self::MILESTONES, true));

        $sent = 0;
        $skippedNoContact = 0;
        $skippedComplete = 0;

        foreach ($candidateExams as $exam) {
            $activeStudentCount = Student::where('school_class_id', $exam->school_class_id)
                ->where('status', 'actif')
                ->count();

            if ($activeStudentCount === 0 || $exam->grades_count >= $activeStudentCount) {
                $skippedComplete++;

                continue;
            }

            $recipients = $exam->invigilators
                ->map(fn ($teacher) => $teacher->email ?? $teacher->professional_email ?? $teacher->user?->email)
                ->filter()
                ->unique();

            if ($recipients->isEmpty() && $exam->creator?->email) {
                $recipients = collect([$exam->creator->email]);
            }

            if ($recipients->isEmpty()) {
                $skippedNoContact++;

                continue;
            }

            $missingCount = $activeStudentCount - $exam->grades_count;

            foreach ($recipients as $email) {
                Mail::to($email)->send(new GradeEntryReminder($exam, $missingCount));
            }
            $sent++;
        }

        $this->info("Rappels envoyés : {$sent}. Déjà complètes : {$skippedComplete}. Sans contact : {$skippedNoContact}.");

        return self::SUCCESS;
    }
}

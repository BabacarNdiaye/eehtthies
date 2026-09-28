<?php

namespace App\Console\Commands;

use App\Mail\AbsenceAlert;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendAbsenceAlerts extends Command
{
    protected $signature = 'app:send-absence-alerts';

    protected $description = "Alerte par e-mail le parent/tuteur quand le nombre d'absences non justifiées d'un élève (cumul année scolaire) atteint un palier (3, 5, 8, 12).";

    private const MILESTONES = [3, 5, 8, 12];

    public function handle(): int
    {
        $today = Carbon::today();
        $yearStart = Carbon::createFromDate($today->month >= 9 ? $today->year : $today->year - 1, 9, 1);

        $counts = Attendance::where('status', 'absent')
            ->where('date', '>=', $yearStart)
            ->whereHas('student', fn ($q) => $q->where('status', 'actif'))
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $atMilestone = $counts->filter(fn ($total) => in_array((int) $total, self::MILESTONES, true));

        $sent = 0;
        $skippedNoContact = 0;

        foreach ($atMilestone as $studentId => $total) {
            $student = Student::with('parentUser:id,name,email')->find($studentId);

            if (! $student) {
                continue;
            }

            $recipientEmail = $student->parentUser?->email ?? $student->guardian_email ?? $student->email;

            if (! $recipientEmail) {
                $skippedNoContact++;

                continue;
            }

            $recentAbsences = Attendance::where('student_id', $studentId)
                ->where('status', 'absent')
                ->where('date', '>=', $yearStart)
                ->with('subject:id,name')
                ->orderByDesc('date')
                ->take(5)
                ->get();

            $recipientName = $student->parentUser?->name ?? $student->guardian_name ?? $student->full_name;

            Mail::to($recipientEmail)->send(new AbsenceAlert($student, (int) $total, $recentAbsences, $recipientName));
            $sent++;
        }

        $this->info("Alertes envoyées : {$sent}. Sans contact e-mail : {$skippedNoContact}.");

        return self::SUCCESS;
    }
}

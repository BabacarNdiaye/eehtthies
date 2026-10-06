<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class StudentRiskAnalyzer
{
    /**
     * Retourne la liste notée des élèves actifs à risque (absences, notes, factures en retard).
     */
    public function analyze(): Collection
    {
        $today = Carbon::today();
        $windowStart = $today->copy()->subDays(30);
        $yearStart = Carbon::createFromDate($today->month >= 9 ? $today->year : $today->year - 1, 9, 1);

        $students = Student::where('status', 'actif')
            ->with(['formation:id,name', 'schoolClass:id,name'])
            ->get();

        $unjustified30 = Attendance::where('status', 'absent')
            ->whereBetween('date', [$windowStart, $today])
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $unjustifiedYear = Attendance::where('status', 'absent')
            ->where('date', '>=', $yearStart)
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $gradesByStudent = Grade::with('exam:id,max_score')
            ->whereNotNull('score')
            ->where('is_absent', false)
            ->whereHas('exam', fn ($q) => $q->where('is_published', true))
            ->get()
            ->groupBy('student_id');

        $overdueByStudent = Invoice::where('due_date', '<', $today)
            ->with('payments:id,invoice_id,amount')
            ->get()
            ->groupBy('student_id');

        return $students->map(function (Student $student) use ($unjustified30, $unjustifiedYear, $gradesByStudent, $overdueByStudent) {
            $abs30 = (int) ($unjustified30[$student->id] ?? 0);
            $absYear = (int) ($unjustifiedYear[$student->id] ?? 0);

            $average = null;
            $studentGrades = $gradesByStudent->get($student->id);
            if ($studentGrades) {
                $normalized = $studentGrades
                    ->filter(fn ($g) => $g->exam && (float) $g->exam->max_score > 0)
                    ->map(fn ($g) => ((float) $g->score / (float) $g->exam->max_score) * 20);
                $average = $normalized->isNotEmpty() ? round($normalized->avg(), 2) : null;
            }

            $overdueBalance = 0.0;
            $overdueInvoicesCount = 0;
            if ($invoices = $overdueByStudent->get($student->id)) {
                foreach ($invoices as $invoice) {
                    $balance = round((float) $invoice->amount - (float) $invoice->discount - (float) $invoice->payments->sum('amount'), 2);
                    if ($balance > 0) {
                        $overdueBalance += $balance;
                        $overdueInvoicesCount++;
                    }
                }
            }

            $score = 0;
            $reasons = [];

            if ($abs30 >= 5) {
                $score += 2;
                $reasons[] = "{$abs30} absences non justifiées (30 derniers jours)";
            } elseif ($abs30 >= 2) {
                $score += 1;
                $reasons[] = "{$abs30} absences non justifiées (30 derniers jours)";
            }

            if ($average !== null) {
                if ($average < 8) {
                    $score += 2;
                    $reasons[] = "Moyenne générale : {$average}/20";
                } elseif ($average < 10) {
                    $score += 1;
                    $reasons[] = "Moyenne générale : {$average}/20";
                }
            }

            if ($overdueBalance > 100000) {
                $score += 2;
                $reasons[] = 'Impayés en retard : '.number_format($overdueBalance, 0, ',', ' ').' FCFA';
            } elseif ($overdueBalance > 0) {
                $score += 1;
                $reasons[] = 'Impayés en retard : '.number_format($overdueBalance, 0, ',', ' ').' FCFA';
            }

            if ($score === 0) {
                return null;
            }

            return [
                'id' => $student->id,
                'name' => $student->full_name,
                'matricule' => $student->matricule,
                'formation' => $student->formation?->name,
                'schoolClass' => $student->schoolClass?->name,
                'score' => $score,
                'level' => $score >= 4 ? 'eleve' : ($score >= 2 ? 'moyen' : 'faible'),
                'reasons' => $reasons,
                'unjustifiedAbsences30d' => $abs30,
                'unjustifiedAbsencesYear' => $absYear,
                'average' => $average,
                'overdueBalance' => $overdueBalance,
                'overdueInvoicesCount' => $overdueInvoicesCount,
            ];
        })->filter()->sortByDesc('score')->values();
    }

    public function summarize(Collection $results, int $totalActiveStudents): array
    {
        return [
            'total' => $results->count(),
            'eleve' => $results->where('level', 'eleve')->count(),
            'moyen' => $results->where('level', 'moyen')->count(),
            'faible' => $results->where('level', 'faible')->count(),
            'totalActiveStudents' => $totalActiveStudents,
        ];
    }
}

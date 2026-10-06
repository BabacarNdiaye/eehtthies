<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidature;
use App\Models\Exam;
use App\Models\Expense;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\LoginLog;
use App\Models\Payment;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use App\Services\StudentRiskAnalyzer;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function academic(): Response
    {
        $studentsPerFormation = Formation::where('is_active', true)
            ->withCount(['students' => fn ($q) => $q->where('status', 'actif')])
            ->get(['id', 'name'])
            ->map(fn ($f) => ['name' => $f->name, 'total' => $f->students_count])
            ->values();

        $genderSplit = Student::where('status', 'actif')
            ->selectRaw('gender, count(*) as total')
            ->groupBy('gender')
            ->pluck('total', 'gender');

        $enrollmentTrend = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);

            return [
                'month' => $date->translatedFormat('M Y'),
                'total' => Student::whereYear('created_at', $date->year)->whereMonth('created_at', $date->month)->count(),
            ];
        });

        $successRateByFormation = Formation::where('is_active', true)
            ->get(['id', 'name'])
            ->map(function (Formation $formation) {
                $reportCards = ReportCard::whereHas('schoolClass', fn ($q) => $q->where('formation_id', $formation->id))
                    ->whereNotNull('average')
                    ->get();

                $total = $reportCards->count();
                $admis = $reportCards->where('decision', 'admis')->count();

                return [
                    'name' => $formation->name,
                    'rate' => $total > 0 ? round(($admis / $total) * 100, 1) : null,
                    'total' => $total,
                ];
            })
            ->filter(fn ($f) => $f['total'] > 0)
            ->values();

        $averageBySubject = Subject::with('formation:id,name')
            ->get()
            ->map(function (Subject $subject) {
                $exams = Exam::where('subject_id', $subject->id)->where('is_published', true)->get(['id', 'max_score'])->keyBy('id');

                if ($exams->isEmpty()) {
                    return null;
                }

                $grades = Grade::whereIn('exam_id', $exams->keys())
                    ->whereNotNull('score')
                    ->where('is_absent', false)
                    ->get();

                if ($grades->isEmpty()) {
                    return null;
                }

                $normalized = $grades->map(fn ($g) => ((float) $g->score / (float) $exams[$g->exam_id]->max_score) * 20);

                return [
                    'subject' => $subject->name,
                    'average' => round($normalized->avg(), 2),
                    'count' => $grades->count(),
                ];
            })
            ->filter()
            ->values();

        $topStudents = ReportCard::with('student:id,first_name,last_name,matricule', 'schoolClass:id,name')
            ->whereNotNull('average')
            ->orderByDesc('average')
            ->take(10)
            ->get();

        $teacherPerformance = Teacher::with('subjects:id,name')
            ->get()
            ->map(function (Teacher $teacher) {
                $subjectIds = $teacher->subjects->pluck('id');
                if ($subjectIds->isEmpty()) {
                    return null;
                }

                $examIds = Exam::whereIn('subject_id', $subjectIds)->where('is_published', true)->get(['id', 'max_score'])->keyBy('id');

                $grades = Grade::whereIn('exam_id', $examIds->keys())
                    ->whereNotNull('score')
                    ->where('is_absent', false)
                    ->get();

                if ($grades->isEmpty()) {
                    return null;
                }

                $normalized = $grades->map(fn ($g) => ((float) $g->score / (float) $examIds[$g->exam_id]->max_score) * 20);

                return [
                    'teacher' => $teacher->full_name,
                    'average' => round($normalized->avg(), 2),
                    'count' => $grades->count(),
                ];
            })
            ->filter()
            ->values();

        return Inertia::render('Admin/Statistics/Academic', [
            'studentsPerFormation' => $studentsPerFormation,
            'genderSplit' => $genderSplit,
            'enrollmentTrend' => $enrollmentTrend,
            'successRateByFormation' => $successRateByFormation,
            'averageBySubject' => $averageBySubject,
            'topStudents' => $topStudents,
            'teacherPerformance' => $teacherPerformance,
        ]);
    }

    public function financial(): Response
    {
        $revenueByFormation = Formation::where('is_active', true)
            ->get(['id', 'name'])
            ->map(function (Formation $formation) {
                $studentIds = Student::where('formation_id', $formation->id)->pluck('id');
                $invoiceIds = Invoice::whereIn('student_id', $studentIds)->pluck('id');
                $revenue = Payment::whereIn('invoice_id', $invoiceIds)->sum('amount');

                return ['name' => $formation->name, 'total' => (float) $revenue];
            })
            ->filter(fn ($f) => $f['total'] > 0)
            ->values();

        $totalExpected = (float) Invoice::sum('amount') - (float) Invoice::sum('discount');
        $totalCollected = (float) Payment::sum('amount');

        $monthly = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);

            return [
                'month' => $date->translatedFormat('M Y'),
                'recettes' => (float) Payment::whereYear('paid_at', $date->year)->whereMonth('paid_at', $date->month)->sum('amount'),
                'depenses' => (float) Expense::whereYear('expense_date', $date->year)->whereMonth('expense_date', $date->month)->sum('amount'),
            ];
        });

        $thisYear = now()->year;
        $lastYear = $thisYear - 1;

        $comparison = [
            'revenue_this_year' => (float) Payment::whereYear('paid_at', $thisYear)->sum('amount'),
            'revenue_last_year' => (float) Payment::whereYear('paid_at', $lastYear)->sum('amount'),
            'expenses_this_year' => (float) Expense::whereYear('expense_date', $thisYear)->sum('amount'),
            'expenses_last_year' => (float) Expense::whereYear('expense_date', $lastYear)->sum('amount'),
        ];

        return Inertia::render('Admin/Statistics/Financial', [
            'revenueByFormation' => $revenueByFormation,
            'totalExpected' => $totalExpected,
            'totalCollected' => $totalCollected,
            'monthly' => $monthly,
            'comparison' => $comparison,
        ]);
    }

    public function atRisk(StudentRiskAnalyzer $analyzer): Response
    {
        $results = $analyzer->analyze();

        return Inertia::render('Admin/Statistics/AtRisk', [
            'students' => $results,
            'summary' => $analyzer->summarize($results, Student::where('status', 'actif')->count()),
        ]);
    }

    public function marketing(): Response
    {
        $monthly = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);

            return [
                'month' => $date->translatedFormat('M Y'),
                'total' => Candidature::whereYear('created_at', $date->year)->whereMonth('created_at', $date->month)->count(),
            ];
        });

        $bySource = Candidature::selectRaw("coalesce(nullif(source, ''), 'site') as source, count(*) as total")
            ->groupBy('source')
            ->pluck('total', 'source');

        $byFormation = Formation::withCount('candidatures')
            ->orderByDesc('candidatures_count')
            ->get(['id', 'name'])
            ->map(fn ($f) => ['name' => $f->name, 'total' => $f->candidatures_count])
            ->values();

        $totalCandidatures = Candidature::count();
        $enrolled = Candidature::where('status', 'inscription_finalisee')->count();
        $conversionRate = $totalCandidatures > 0 ? round(($enrolled / $totalCandidatures) * 100, 1) : 0;

        return Inertia::render('Admin/Statistics/Marketing', [
            'monthly' => $monthly,
            'bySource' => $bySource,
            'byFormation' => $byFormation,
            'totalCandidatures' => $totalCandidatures,
            'enrolled' => $enrolled,
            'conversionRate' => $conversionRate,
        ]);
    }

    public function traffic(): Response
    {
        $since = Carbon::now()->subDays(29)->startOfDay();

        $daily = collect(range(29, 0))->map(function ($daysAgo) {
            $date = Carbon::now()->subDays($daysAgo);

            return [
                'day' => $date->translatedFormat('d M'),
                'total' => LoginLog::whereDate('created_at', $date->toDateString())->count(),
            ];
        });

        // « Personnel » regroupe tous les rôles sauf les trois orientés portail, comme le regroupement déjà
        // utilisé par EnsureUserIsStaff.
        $roleLabels = ['eleve' => 'Élèves', 'enseignant' => 'Enseignants', 'parent' => 'Parents'];
        $activeUserIds = LoginLog::where('created_at', '>=', $since)->distinct()->pluck('user_id');

        $byRole = collect($roleLabels)
            ->map(fn ($label, $role) => [
                'name' => $label,
                'total' => User::role($role)->whereIn('id', $activeUserIds)->count(),
            ])
            ->push([
                'name' => 'Personnel',
                'total' => User::whereIn('id', $activeUserIds)
                    ->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', array_keys($roleLabels)))
                    ->count(),
            ])
            ->values();

        $totalUsers = User::count();
        $activeUsers30d = $activeUserIds->count();
        $neverLoggedIn = User::whereNull('last_login_at')->count();
        $logins30d = LoginLog::where('created_at', '>=', $since)->count();

        $recent = LoginLog::with('user:id,name')
            ->latest()
            ->take(15)
            ->get(['id', 'user_id', 'ip_address', 'created_at']);

        return Inertia::render('Admin/Statistics/Traffic', [
            'daily' => $daily,
            'byRole' => $byRole,
            'totalUsers' => $totalUsers,
            'activeUsers30d' => $activeUsers30d,
            'neverLoggedIn' => $neverLoggedIn,
            'logins30d' => $logins30d,
            'recent' => $recent,
        ]);
    }
}

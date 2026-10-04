<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidature;
use App\Models\ContactMessage;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\NewsArticle;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $user = Auth::user();
        $kpis = [];

        if ($user->can('voir_eleves')) {
            $kpis['students'] = Student::where('status', 'actif')->count();
            $kpis['new_students_30d'] = Student::where('created_at', '>=', now()->subDays(30))->count();
        }

        if ($user->can('voir_candidatures')) {
            $kpis['candidatures_received'] = Candidature::count();
            $kpis['candidatures_pending'] = Candidature::whereIn('status', ['soumise', 'en_cours_etude', 'dossier_incomplet', 'preselectionnee'])->count();
        }

        if ($user->can('voir_enseignants')) {
            $kpis['teachers_active'] = Teacher::where('status', 'actif')->count();
        }

        if ($user->can('voir_communication')) {
            $kpis['unread_messages'] = ContactMessage::where('is_read', false)->count();
        }

        $candidaturesByStatus = null;
        $monthlyCandidatures = null;
        $latestCandidatures = null;

        if ($user->can('voir_candidatures')) {
            $candidaturesByStatus = Candidature::selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');

            $monthlyCandidatures = collect(range(5, 0))->map(function ($monthsAgo) {
                $date = Carbon::now()->subMonths($monthsAgo);

                return [
                    'month' => $date->translatedFormat('M Y'),
                    'total' => Candidature::whereYear('created_at', $date->year)
                        ->whereMonth('created_at', $date->month)
                        ->count(),
                ];
            });

            $latestCandidatures = Candidature::with('formation:id,name')->latest()->take(6)->get();
        }

        $studentsPerFormation = null;

        if ($user->can('voir_eleves') || $user->can('voir_formations')) {
            $studentsPerFormation = Formation::where('is_active', true)
                ->withCount(['students' => fn ($q) => $q->where('status', 'actif')])
                ->get(['id', 'name'])
                ->map(fn ($f) => ['name' => $f->name, 'total' => $f->students_count])
                ->values();
        }

        $latestNews = $user->can('voir_actualites')
            ? NewsArticle::latest()->take(5)->get(['id', 'title', 'is_published', 'published_at'])
            : null;

        return Inertia::render('Admin/Dashboard', [
            'todo' => $this->todo($user, $kpis),
            'kpis' => $kpis,
            'candidaturesByStatus' => $candidaturesByStatus,
            'studentsPerFormation' => $studentsPerFormation,
            'monthlyCandidatures' => $monthlyCandidatures,
            'latestNews' => $latestNews,
            'latestCandidatures' => $latestCandidatures,
        ]);
    }

    /**
     * Ce qui attend une décision du personnel. Chaque chiffre n'existe que si le rôle peut ouvrir la page vers
     * laquelle il renvoie (même règle que les listes) : un rôle sans droit ne reçoit ni le chiffre, ni la clé.
     *
     * @param  array<string, int>  $kpis
     * @return array<string, mixed>
     */
    private function todo(User $user, array $kpis): array
    {
        $todo = [];

        if ($user->can('voir_candidatures')) {
            $todo['candidatures_to_review'] = $kpis['candidatures_pending'];
        }

        if ($user->can('voir_comptabilite')) {
            $outstanding = Invoice::outstanding(withStudent: false);

            // Le franc CFA n'a pas de centimes : le montant s'envoie en entier.
            $todo['invoices_outstanding'] = [
                'count' => $outstanding->count(),
                'amount' => (int) round($outstanding->sum('computed_balance')),
            ];
        }

        // Valider ou refuser un congé demande le droit « modifier_utilisateurs » (voir LeaveController).
        if ($user->can('modifier_utilisateurs')) {
            $todo['leave_pending'] = LeaveRequest::where('status', 'en_attente')->count();
        }

        if ($user->can('voir_communication')) {
            $todo['messages_unread'] = $kpis['unread_messages'];
        }

        return $todo;
    }
}

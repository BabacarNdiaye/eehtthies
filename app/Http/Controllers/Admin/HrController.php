<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HrController extends Controller
{
    /**
     * Vue d'ensemble RH : effectif unifié (personnel administratif + enseignants,
     * ces deux ensembles étant déjà mutuellement exclusifs — adminStaff() exclut
     * le rôle enseignant) avec indicateurs clés et accès rapide aux 5 sous-modules.
     */
    public function index(Request $request): Response
    {
        $adminStaff = User::adminStaff()
            ->with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'avatar', 'position', 'department', 'hire_date', 'monthly_salary', 'is_active']);

        $teachers = Teacher::orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'photo', 'professional_email', 'email', 'phone', 'specialty', 'experience_years', 'status']);

        $directory = $adminStaff->map(fn (User $u) => [
            'id' => 'user-'.$u->id,
            'name' => $u->name,
            'photo' => $u->avatar,
            'role' => $u->roles->pluck('name')->first() ?? 'Personnel',
            'detail' => $u->position ?: ($u->department ?: '—'),
            'email' => $u->email,
            'phone' => null,
            'active' => (bool) $u->is_active,
            'editUrl' => route('admin.users.edit', $u->id),
            'department' => $u->department ?: null,
            'hireDate' => $u->hire_date?->toDateString(),
        ])->concat($teachers->map(fn (Teacher $t) => [
            'id' => 'teacher-'.$t->id,
            'name' => $t->full_name,
            'photo' => $t->photo,
            'role' => 'Enseignant',
            'detail' => $t->specialty ?: '—',
            'email' => $t->professional_email ?: $t->email,
            'phone' => $t->phone,
            'active' => $t->status === 'actif',
            'editUrl' => route('admin.teachers.edit', $t->id),
            'department' => 'Enseignement',
            'hireDate' => null,
        ]))->sortBy('name')->values();

        // Les enseignants à salaire fixe portent désormais leur propre monthly_salary directement sur Teacher
        // (sans compte User lié requis) — les enseignants payés à l'heure ne sont pas inclus ici, car leur
        // rémunération varie d'un mois à l'autre.
        $monthlyPayroll = (float) $adminStaff->sum('monthly_salary')
            + (float) $teachers->where('payment_type', 'fixe')->sum('monthly_salary');
        $today = Carbon::today();
        $paidThisMonth = (float) SalaryPayment::where('period_year', $today->year)
            ->where('period_month', $today->month)
            ->sum('amount');

        $departments = $adminStaff->pluck('department')->filter()->unique()->values();

        $byDepartment = $adminStaff->groupBy(fn (User $u) => $u->department ?: 'Sans service')
            ->map(fn ($group, $name) => ['name' => $name, 'count' => $group->count()])
            ->when($teachers->isNotEmpty(), fn ($c) => $c->put('Enseignement', ['name' => 'Enseignement', 'count' => $teachers->count()]))
            ->sortByDesc('count')->values();

        $hired = $adminStaff->filter(fn (User $u) => $u->hire_date);
        $averageTenure = $hired->isEmpty() ? null : round($hired->avg(fn (User $u) => $u->hire_date->diffInDays($today) / 365.25), 1);

        $leaveBase = LeaveRequest::with('user:id,name,avatar')->orderBy('start_date');
        $pendingLeaves = (clone $leaveBase)->where('status', 'en_attente')->get();
        $onLeave = (clone $leaveBase)->where('status', 'approuve')
            ->whereDate('start_date', '<=', $today)->whereDate('end_date', '>=', $today)->get();
        $leaveRow = fn (LeaveRequest $l) => [
            'id' => $l->id,
            'name' => $l->user?->name ?? '—',
            'type' => LeaveRequest::TYPES[$l->type] ?? $l->type,
            'start' => $l->start_date->toDateString(),
            'end' => $l->end_date->toDateString(),
        ];

        $payrollRun = PayrollRun::where('period_year', $today->year)->where('period_month', $today->month)->first();

        // Dossiers à compléter : ce qui manque pour une gestion RH fiable.
        $incomplete = [
            ['label' => "Sans date d'embauche", 'count' => $adminStaff->whereNull('hire_date')->count(), 'href' => route('admin.users.index')],
            ['label' => 'Sans fonction renseignée', 'count' => $adminStaff->filter(fn (User $u) => ! $u->position)->count(), 'href' => route('admin.users.index')],
            ['label' => 'Enseignants sans téléphone', 'count' => $teachers->filter(fn (Teacher $t) => ! $t->phone)->count(), 'href' => route('admin.teachers.index')],
            ['label' => 'Comptes inactifs', 'count' => $directory->where('active', false)->count(), 'href' => route('admin.users.index')],
        ];

        $user = $request->user();

        return Inertia::render('Admin/Hr/Index', [
            'directory' => $directory,
            'summary' => [
                'total' => $directory->count(),
                'adminStaff' => $adminStaff->count(),
                'teachers' => $teachers->count(),
                'active' => $directory->where('active', true)->count(),
                'inactive' => $directory->where('active', false)->count(),
                'departmentsCount' => $departments->count(),
                'monthlyPayroll' => $monthlyPayroll,
                'paidThisMonth' => $paidThisMonth,
                'averageTenure' => $averageTenure,
                'newThisYear' => $hired->filter(fn (User $u) => $u->hire_date->year === $today->year)->count(),
                'pendingLeaves' => $pendingLeaves->count(),
                'onLeaveToday' => $onLeave->count(),
                'payrollStatus' => $payrollRun?->status,
            ],
            'departments' => $byDepartment,
            'leave' => [
                'pending' => $pendingLeaves->take(5)->map($leaveRow)->values(),
                'today' => $onLeave->take(6)->map($leaveRow)->values(),
            ],
            'recentHires' => $hired->sortByDesc('hire_date')->take(5)->map(fn (User $u) => [
                'name' => $u->name,
                'photo' => $u->avatar,
                'detail' => $u->position ?: ($u->department ?: '—'),
                'hireDate' => $u->hire_date->toDateString(),
            ])->values(),
            'incomplete' => array_values(array_filter($incomplete, fn ($i) => $i['count'] > 0)),
            'can' => [
                'payroll' => (bool) $user?->can('voir_salaires'),
                'teachers' => (bool) $user?->can('voir_enseignants'),
                'roles' => (bool) $user?->can('voir_roles'),
                'orgChart' => (bool) $user?->can('voir_organigramme'),
            ],
        ]);
    }
}

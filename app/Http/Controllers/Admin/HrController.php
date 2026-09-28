<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\User;
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
    public function index(): Response
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
        ]))->sortBy('name')->values();

        // Fixed-salary teachers now carry their own monthly_salary directly on
        // Teacher (no longer requiring a linked User account) — hourly-paid
        // teachers aren't included here since their pay varies month to month.
        $monthlyPayroll = (float) $adminStaff->sum('monthly_salary')
            + (float) $teachers->where('payment_type', 'fixe')->sum('monthly_salary');
        $today = Carbon::today();
        $paidThisMonth = (float) SalaryPayment::where('period_year', $today->year)
            ->where('period_month', $today->month)
            ->sum('amount');

        $departments = $adminStaff->pluck('department')->filter()->unique()->values();

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
            ],
        ]);
    }
}

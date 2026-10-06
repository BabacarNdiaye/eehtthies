<?php

namespace App\Services;

use App\Models\LessonLog;
use App\Models\PayrollLine;
use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Prépare un cycle de paie : une ligne par personne rémunérée, calculée mais jamais payée. Le personnel administratif
 * touche son salaire mensuel ; un enseignant à salaire fixe aussi ; un enseignant payé à l'heure touche les heures de ses
 * séances du cahier de texte (durée du créneau d'emploi du temps) multipliées par son taux. Ce qui a déjà été versé par le
 * registre des salaires est reconnu, et ceux qu'on ne peut pas payer faute de rémunération renseignée sont signalés.
 */
class PayrollPreparer
{
    /** Crée (ou retrouve) le cycle du mois ; une préparation répétée ne change rien. */
    public function prepare(int $year, int $month, ?User $by = null): PayrollRun
    {
        $run = PayrollRun::firstOrCreate(
            ['period_year' => $year, 'period_month' => $month],
            ['status' => PayrollRun::DRAFT, 'created_by' => $by?->id],
        );

        if ($run->wasRecentlyCreated) {
            $this->addMissingLines($run);
        }

        return $run;
    }

    /**
     * Ajoute au cycle les personnes devenues éligibles depuis la préparation, sans toucher aux lignes existantes.
     *
     * @return int nombre de lignes ajoutées
     */
    public function refresh(PayrollRun $run): int
    {
        return $this->addMissingLines($run);
    }

    /**
     * Personnes actives qu'on ne peut pas mettre dans le cycle faute de rémunération renseignée.
     *
     * @return list<array{name: string, reason: string}>
     */
    public function missing(PayrollRun $run): array
    {
        [$staffIds, $teacherIds] = $this->presentIds($run);
        $missing = [];

        foreach ($this->staff()->whereNotIn('id', $staffIds)->get() as $user) {
            if (! $this->payable($user->monthly_salary)) {
                $missing[] = ['name' => $user->name, 'reason' => 'Aucun salaire mensuel renseigné'];
            }
        }

        foreach ($this->teachers()->whereNotIn('id', $teacherIds)->get() as $teacher) {
            if ($teacher->payment_type === 'horaire' && ! $this->payable($teacher->hourly_rate)) {
                $missing[] = ['name' => $teacher->full_name, 'reason' => 'Aucun taux horaire renseigné'];
            } elseif ($teacher->payment_type !== 'horaire' && ! $this->payable($teacher->monthly_salary)) {
                $missing[] = ['name' => $teacher->full_name, 'reason' => 'Aucun salaire mensuel renseigné'];
            }
        }

        return $missing;
    }

    private function addMissingLines(PayrollRun $run): int
    {
        [$staffIds, $teacherIds] = $this->presentIds($run);
        $added = 0;

        foreach ($this->staff()->whereNotIn('id', $staffIds)->get() as $user) {
            $paid = SalaryPayment::where('user_id', $user->id)->where('period_year', $run->period_year)->where('period_month', $run->period_month)->first();

            if (! $paid && ! $this->payable($user->monthly_salary)) {
                continue;
            }

            $amount = $paid ? (float) $paid->amount : (float) $user->monthly_salary;

            PayrollLine::create([
                'payroll_run_id' => $run->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'position' => $user->position,
                'payment_type' => 'fixe',
                'base_amount' => $amount,
                'net_amount' => $amount,
                'payout_channel' => $user->payout_channel,
                'payout_account' => $user->payout_account,
                'salary_payment_id' => $paid?->id,
            ]);
            $added++;
        }

        foreach ($this->teachers()->whereNotIn('id', $teacherIds)->get() as $teacher) {
            $paid = TeacherSalaryPayment::where('teacher_id', $teacher->id)->where('period_year', $run->period_year)->where('period_month', $run->period_month)->first();
            $hourly = $teacher->payment_type === 'horaire';

            if (! $paid && ! $this->payable($hourly ? $teacher->hourly_rate : $teacher->monthly_salary)) {
                continue;
            }

            $sessions = $hourly ? $this->sessionsOf($teacher, $run->period_year, $run->period_month) : ['hours' => null, 'unmatched' => 0];
            $base = $hourly ? round($sessions['hours'] * (float) $teacher->hourly_rate, 2) : (float) $teacher->monthly_salary;

            PayrollLine::create([
                'payroll_run_id' => $run->id,
                'teacher_id' => $teacher->id,
                'name' => $teacher->full_name,
                'position' => 'Enseignant — '.($teacher->specialty ?: '—'),
                'payment_type' => $hourly ? 'horaire' : 'fixe',
                'base_amount' => $paid ? (float) $paid->amount : $base,
                'hours' => $paid ? $paid->hours_worked : $sessions['hours'],
                'hourly_rate' => $hourly ? $teacher->hourly_rate : null,
                'net_amount' => $paid ? (float) $paid->amount : $base,
                'payout_channel' => $teacher->payout_channel,
                'payout_account' => $teacher->payout_account,
                'unmatched_sessions' => $sessions['unmatched'],
                'teacher_salary_payment_id' => $paid?->id,
            ]);
            $added++;
        }

        return $added;
    }

    /**
     * Heures de cours d'un enseignant sur un mois : la durée du créneau d'emploi du temps de chaque séance du cahier de
     * texte. Une séance sans créneau n'a pas de durée connue : elle est comptée à part, pour qu'on la regarde à la main.
     *
     * @return array{hours: float, unmatched: int}
     */
    public function sessionsOf(Teacher $teacher, int $year, int $month): array
    {
        $first = Carbon::create($year, $month, 1)->startOfDay();
        $last = $first->copy()->endOfMonth()->startOfDay();

        // whereDate compare des jours, pas des instants : « 2026-10-01 » reste dans le mois même quand la base (SQLite) a stocké la date sans l'heure.
        $logs = LessonLog::where('teacher_id', $teacher->id)
            ->whereDate('date', '>=', $first)
            ->whereDate('date', '<=', $last)
            ->with('timetableEntry:id,start_time,end_time')
            ->get();

        $seconds = 0;
        $unmatched = 0;

        foreach ($logs as $log) {
            $entry = $log->timetableEntry;
            $length = $entry && $entry->start_time && $entry->end_time ? strtotime($entry->end_time) - strtotime($entry->start_time) : 0;

            if ($length <= 0) {
                $unmatched++;

                continue;
            }

            $seconds += $length;
        }

        return ['hours' => round($seconds / 3600, 2), 'unmatched' => $unmatched];
    }

    /** Personnel administratif actif : tout compte qui n'est pas seulement enseignant, élève ou parent (comme le registre). */
    private function staff(): Builder
    {
        return User::query()
            ->where('is_active', true)
            ->where(function (Builder $query) {
                $query->whereDoesntHave('roles')
                    ->orWhereHas('roles', fn (Builder $roles) => $roles->whereNotIn('name', ['enseignant', 'eleve', 'parent']));
            })
            ->orderBy('name');
    }

    private function teachers(): Builder
    {
        return Teacher::query()->where('status', 'actif')->orderBy('last_name')->orderBy('first_name');
    }

    private function payable(mixed $amount): bool
    {
        return $amount !== null && (float) $amount > 0;
    }

    /** @return array{0: Collection<int, int>, 1: Collection<int, int>} identifiants du personnel et des enseignants déjà dans le cycle */
    private function presentIds(PayrollRun $run): array
    {
        $lines = $run->lines()->get(['user_id', 'teacher_id']);

        return [$lines->pluck('user_id')->filter()->values(), $lines->pluck('teacher_id')->filter()->values()];
    }
}

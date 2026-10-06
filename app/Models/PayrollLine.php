<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Une personne dans un cycle de paie : ce qui a été préparé (base, heures, primes, retenues, net, compte de versement)
 * et, une fois payée, le lien vers le paiement enregistré. Le numéro de compte n'est jamais sérialisé : les pages en
 * montrent la version masquée.
 */
class PayrollLine extends Model
{
    public const BONUS = 'prime';

    public const DEDUCTION = 'retenue';

    protected $fillable = [
        'payroll_run_id', 'user_id', 'teacher_id', 'name', 'position', 'payment_type', 'base_amount', 'hours', 'hourly_rate',
        'adjustments', 'net_amount', 'payout_channel', 'payout_account', 'unmatched_sessions', 'notes',
        'salary_payment_id', 'teacher_salary_payment_id',
    ];

    protected $hidden = ['payout_account'];

    protected $casts = [
        'base_amount' => 'decimal:2',
        'hours' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'adjustments' => 'array',
        'unmatched_sessions' => 'integer',
    ];

    public function run()
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function salaryPayment()
    {
        return $this->belongsTo(SalaryPayment::class);
    }

    public function teacherSalaryPayment()
    {
        return $this->belongsTo(TeacherSalaryPayment::class);
    }

    /** Payé ⇔ le paiement existe : annuler celui-ci dans le registre remet la ligne « à payer ». */
    public function getIsPaidAttribute(): bool
    {
        return $this->salary_payment_id !== null || $this->teacher_salary_payment_id !== null;
    }

    /** Le paiement enregistré (personnel ou enseignant), s'il y en a un. */
    public function payment(): SalaryPayment|TeacherSalaryPayment|null
    {
        return $this->salaryPayment ?? $this->teacherSalaryPayment;
    }

    /** Numéro du bulletin : BP-2026-10-17 (année, mois, ligne). */
    public function getReferenceAttribute(): string
    {
        $run = $this->run;

        return sprintf('BP-%d-%02d-%d', $run->period_year, $run->period_month, $this->id);
    }

    /** @return Collection<int, array{type: string, label: string, amount: float}> */
    public function adjustmentsOf(string $type): Collection
    {
        return collect($this->adjustments ?? [])->where('type', $type)->values();
    }

    /** Net = base + primes − retenues. */
    public function computeNet(?float $base = null): float
    {
        $base ??= (float) $this->base_amount;

        return round($base + (float) $this->adjustmentsOf(self::BONUS)->sum('amount') - (float) $this->adjustmentsOf(self::DEDUCTION)->sum('amount'), 2);
    }
}

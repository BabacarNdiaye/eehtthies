<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use App\Support\SalaryException;
use Illuminate\Support\Facades\DB;

/**
 * Seul chemin d'écriture d'un versement de salaire (registre des salaires comme paie mensuelle) : une dépense
 * « salaires » (dont l'écriture comptable) et le paiement de la personne, ensemble ou pas du tout. Un seul versement par
 * personne et par mois.
 */
class SalaryRecorder
{
    /**
     * @param  string  $method  famille de l'enum de la base (especes, virement, mobile_money, autre), voir PaymentChannels::methodFor
     *
     * @throws SalaryException quand le salaire de ce mois a déjà été enregistré
     */
    public function record(
        User|Teacher $payee,
        int $year,
        int $month,
        float $amount,
        string $paidAt,
        string $method,
        ?float $hours = null,
        ?string $notes = null,
        ?int $recordedBy = null,
    ): SalaryPayment|TeacherSalaryPayment {
        $isTeacher = $payee instanceof Teacher;
        $name = $isTeacher ? $payee->full_name : $payee->name;

        return DB::transaction(function () use ($payee, $isTeacher, $name, $year, $month, $amount, $paidAt, $method, $hours, $notes, $recordedBy) {
            $exists = $isTeacher
                ? TeacherSalaryPayment::where('teacher_id', $payee->id)->where('period_year', $year)->where('period_month', $month)->exists()
                : SalaryPayment::where('user_id', $payee->id)->where('period_year', $year)->where('period_month', $month)->exists();

            if ($exists) {
                throw new SalaryException('Le salaire de ce mois a déjà été enregistré.');
            }

            $expense = Expense::create([
                'category' => 'salaires',
                'label' => 'Salaire — '.Invoice::MONTH_LABELS[$month].' '.$year.' — '.$name,
                'amount' => $amount,
                'expense_date' => $paidAt,
                'payment_method' => $method,
                'notes' => $notes,
                'recorded_by' => $recordedBy,
            ]);

            $common = [
                'period_year' => $year,
                'period_month' => $month,
                'amount' => $amount,
                'paid_at' => $paidAt,
                'payment_method' => $method,
                'notes' => $notes,
                'expense_id' => $expense->id,
                'recorded_by' => $recordedBy,
            ];

            return $isTeacher
                ? TeacherSalaryPayment::create($common + ['teacher_id' => $payee->id, 'hours_worked' => $hours])
                : SalaryPayment::create($common + ['user_id' => $payee->id]);
        });
    }
}

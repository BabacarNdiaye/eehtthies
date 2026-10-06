<?php

namespace App\Support;

use App\Models\PayrollLine;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;

/** Bulletin de paie détaillé d'une ligne de paie : base, heures, primes, retenues, net, mode de versement (compte masqué). */
final class Payslip
{
    /** @return array<string, mixed> */
    public static function viewData(PayrollLine $line): array
    {
        $line->loadMissing('run', 'salaryPayment', 'teacherSalaryPayment');
        $payment = $line->payment();

        return [
            'name' => $line->name,
            'position' => $line->position ?: '—',
            'periodLabel' => $line->run->label,
            'reference' => $line->reference,
            'paymentType' => $line->payment_type,
            'baseAmount' => (float) $line->base_amount,
            'hours' => $line->hours !== null ? (float) $line->hours : null,
            'hourlyRate' => $line->hourly_rate !== null ? (float) $line->hourly_rate : null,
            'bonuses' => $line->adjustmentsOf(PayrollLine::BONUS),
            'deductions' => $line->adjustmentsOf(PayrollLine::DEDUCTION),
            'netAmount' => (float) $line->net_amount,
            'channelLabel' => PaymentChannels::labelFor($line->payout_channel, $payment?->payment_method),
            'accountMasked' => PayoutAccount::mask($line->payout_account),
            'paidAt' => $payment?->paid_at,
        ];
    }

    /**
     * Ce qu'affiche une liste de bulletins (« Ma paie ») : le détail du calcul et le mode de versement, jamais le compte
     * en clair.
     *
     * @return array<string, mixed>
     */
    public static function summary(PayrollLine $line): array
    {
        $line->loadMissing('run', 'salaryPayment', 'teacherSalaryPayment');
        $payment = $line->payment();

        return [
            'id' => $line->id,
            'period_year' => $line->run->period_year,
            'period_month' => $line->run->period_month,
            'period_label' => $line->run->label,
            'reference' => $line->reference,
            'payment_type' => $line->payment_type,
            'base_amount' => (float) $line->base_amount,
            'hours' => $line->hours !== null ? (float) $line->hours : null,
            'hourly_rate' => $line->hourly_rate !== null ? (float) $line->hourly_rate : null,
            'bonuses' => $line->adjustmentsOf(PayrollLine::BONUS)->values()->all(),
            'deductions' => $line->adjustmentsOf(PayrollLine::DEDUCTION)->values()->all(),
            'net_amount' => (float) $line->net_amount,
            'channel_label' => PaymentChannels::labelFor($line->payout_channel, $payment?->payment_method),
            'account_masked' => PayoutAccount::mask($line->payout_account),
            'paid_at' => $payment?->paid_at?->toDateString(),
        ];
    }

    /**
     * Les bulletins déjà payés d'une liste de lignes de paie, le plus récent d'abord. Une ligne non payée n'a pas de
     * bulletin : l'intéressé ne voit rien d'un cycle encore en préparation.
     *
     * @param  Collection<int, PayrollLine>  $lines
     * @return list<array<string, mixed>>
     */
    public static function paidSummaries(Collection $lines): array
    {
        return $lines
            ->load('run', 'salaryPayment', 'teacherSalaryPayment')
            ->filter(fn (PayrollLine $line) => $line->is_paid)
            ->sortByDesc(fn (PayrollLine $line) => $line->run->period_year * 100 + $line->run->period_month)
            ->map(fn (PayrollLine $line) => self::summary($line))
            ->values()
            ->all();
    }

    public static function pdf(PayrollLine $line)
    {
        return Pdf::loadView('pdf.payroll-payslip', self::viewData($line));
    }

    public static function filename(PayrollLine $line): string
    {
        return "bulletin-{$line->reference}.pdf";
    }
}

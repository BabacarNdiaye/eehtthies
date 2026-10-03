<?php

namespace App\Console\Commands;

use App\Mail\FinancialDigest;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\StaffRecipients;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendFinancialDigest extends Command
{
    protected $signature = 'app:send-financial-digest';

    protected $description = 'Envoie au personnel de direction le bilan financier du mois écoulé (recettes, dépenses, solde, comparaison au mois précédent).';

    public function handle(): int
    {
        $lastMonth = Carbon::now()->subMonthNoOverflow();
        $monthBefore = $lastMonth->copy()->subMonthNoOverflow();

        $data = [
            'monthLabel' => $lastMonth->translatedFormat('F Y'),
            'revenue' => (float) Payment::whereYear('paid_at', $lastMonth->year)->whereMonth('paid_at', $lastMonth->month)->sum('amount'),
            'expenses' => (float) Expense::whereYear('expense_date', $lastMonth->year)->whereMonth('expense_date', $lastMonth->month)->sum('amount'),
            'previousRevenue' => (float) Payment::whereYear('paid_at', $monthBefore->year)->whereMonth('paid_at', $monthBefore->month)->sum('amount'),
            'previousExpenses' => (float) Expense::whereYear('expense_date', $monthBefore->year)->whereMonth('expense_date', $monthBefore->month)->sum('amount'),
            'newInvoicesAmount' => (float) Invoice::whereYear('created_at', $lastMonth->year)->whereMonth('created_at', $lastMonth->month)->sum('amount'),
            'outstandingBalance' => round((float) Invoice::sum('amount') - (float) Invoice::sum('discount') - (float) Payment::sum('amount'), 2),
        ];
        $data['net'] = round($data['revenue'] - $data['expenses'], 2);
        $data['previousNet'] = round($data['previousRevenue'] - $data['previousExpenses'], 2);

        $recipients = StaffRecipients::withPermission('voir_statistiques');

        if ($recipients->isEmpty()) {
            $this->warn('Aucun destinataire (personnel avec la permission voir_statistiques) — digest non envoyé.');

            return self::SUCCESS;
        }

        foreach ($recipients as $recipient) {
            Mail::to($recipient->email)->send(new FinancialDigest($data, $recipient->name));
        }

        $this->info("Digest financier envoyé à {$recipients->count()} destinataire(s) pour {$data['monthLabel']}.");

        return self::SUCCESS;
    }
}

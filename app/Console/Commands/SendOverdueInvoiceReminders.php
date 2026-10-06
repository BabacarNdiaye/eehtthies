<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\PaymentReminder;
use App\Models\Setting;
use App\Services\FamilyChannels;
use App\Services\PaymentReminderSender;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendOverdueInvoiceReminders extends Command
{
    protected $signature = 'app:send-overdue-invoice-reminders';

    protected $description = "Relance les familles pour les factures en retard, à des paliers fixes (3, 7, 15, 30, 60 jours de retard) et, si le réglage est activé, trois jours avant l'échéance. Chaque envoi est journalisé : un palier ne part jamais deux fois.";

    public function handle(PaymentReminderSender $sender, FamilyChannels $family): int
    {
        $today = Carbon::today();
        $remindBefore = Setting::flag('finance_remind_before_due');
        $horizon = $today->copy()->addDays(abs(PaymentReminder::BEFORE_DUE));

        // Les factures échues, plus (pour le rappel avant échéance) celles qui échoient dans les trois jours.
        $invoices = Invoice::whereNotNull('due_date')
            ->where('due_date', '<=', $horizon)
            ->whereHas('student', fn ($query) => $query->where('status', 'actif'))
            ->with(['payments:id,invoice_id,amount', 'student.parentUser', 'student.user'])
            ->get()
            ->map(function (Invoice $invoice) {
                $invoice->computed_balance = round($invoice->net_amount - (float) $invoice->payments->sum('amount'), 2);

                return $invoice;
            })
            ->filter(fn (Invoice $invoice) => $invoice->computed_balance > 0);

        // Paliers déjà partis : « facture:palier ».
        $logged = PaymentReminder::whereIn('invoice_id', $invoices->modelKeys())
            ->whereNotNull('milestone')
            ->get(['invoice_id', 'milestone'])
            ->mapWithKeys(fn (PaymentReminder $reminder) => ["{$reminder->invoice_id}:{$reminder->milestone}" => true]);

        $isNew = fn (Invoice $invoice, int $milestone) => ! $logged->has("{$invoice->id}:{$milestone}");

        $sent = $before = $noContact = $failed = 0;

        foreach ($invoices->groupBy('student_id') as $studentInvoices) {
            $student = $studentInvoices->first()->student;
            $overdue = $studentInvoices->filter(fn (Invoice $invoice) => $invoice->daysPastDue($today) > 0)->values();

            $triggers = $overdue->filter(fn (Invoice $invoice) => in_array($invoice->daysPastDue($today), PaymentReminder::MILESTONES, true)
                && $isNew($invoice, $invoice->daysPastDue($today)));

            if ($triggers->isNotEmpty()) {
                // Une relance de retard cite toutes les factures échues de l'élève, pas seulement celles qui ont atteint un palier.
                $cited = $overdue;
                $milestones = $triggers->mapWithKeys(fn (Invoice $invoice) => [$invoice->id => $invoice->daysPastDue($today)])->all();
                $upcoming = false;
            } elseif ($remindBefore) {
                $cited = $studentInvoices
                    ->filter(fn (Invoice $invoice) => $invoice->daysPastDue($today) === PaymentReminder::BEFORE_DUE && $isNew($invoice, PaymentReminder::BEFORE_DUE))
                    ->values();

                if ($cited->isEmpty()) {
                    continue;
                }

                $milestones = $cited->mapWithKeys(fn (Invoice $invoice) => [$invoice->id => PaymentReminder::BEFORE_DUE])->all();
                $upcoming = true;
            } else {
                continue;
            }

            if (! $family->canReach($student)) {
                $noContact++;

                continue;
            }

            if ($sender->send($student, $cited, PaymentReminder::KIND_AUTO, $milestones) === []) {
                $failed++;

                continue;
            }

            $sent++;
            $before += $upcoming ? 1 : 0;
        }

        $this->info("Relances envoyées : {$sent} (dont {$before} avant échéance). Sans contact : {$noContact}.".($failed > 0 ? " Non parties : {$failed}." : ''));

        return self::SUCCESS;
    }
}

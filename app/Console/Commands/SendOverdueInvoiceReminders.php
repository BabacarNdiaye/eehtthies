<?php

namespace App\Console\Commands;

use App\Mail\OverdueInvoiceReminder;
use App\Models\Invoice;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendOverdueInvoiceReminders extends Command
{
    protected $signature = 'app:send-overdue-invoice-reminders';

    protected $description = 'Envoie une relance par e-mail au parent/tuteur pour les factures en retard, à des paliers fixes (3, 7, 15, 30, 60 jours de retard) pour éviter de spammer.';

    private const MILESTONES = [3, 7, 15, 30, 60];

    public function handle(): int
    {
        $today = Carbon::today();

        $overdueInvoices = Invoice::where('due_date', '<', $today)
            ->whereHas('student', fn ($q) => $q->where('status', 'actif'))
            ->with(['payments:id,invoice_id,amount', 'student.parentUser:id,name,email'])
            ->get()
            ->map(function (Invoice $invoice) {
                $invoice->computed_balance = round(
                    (float) $invoice->amount - (float) $invoice->discount - (float) $invoice->payments->sum('amount'),
                    2
                );

                return $invoice;
            })
            ->filter(fn (Invoice $invoice) => $invoice->computed_balance > 0);

        $byStudent = $overdueInvoices->groupBy('student_id');

        $sent = 0;
        $skippedNoContact = 0;

        foreach ($byStudent as $invoices) {
            $dueTodayMilestone = $invoices->contains(
                fn (Invoice $invoice) => in_array((int) $today->diffInDays($invoice->due_date, absolute: true), self::MILESTONES, true)
            );

            if (! $dueTodayMilestone) {
                continue;
            }

            $student = $invoices->first()->student;
            $recipientEmail = $student->parentUser?->email ?? $student->guardian_email ?? $student->email;

            if (! $recipientEmail) {
                $skippedNoContact++;

                continue;
            }

            $recipientName = $student->parentUser?->name ?? $student->guardian_name ?? $student->full_name;
            $totalDue = $invoices->sum('computed_balance');

            Mail::to($recipientEmail)->send(new OverdueInvoiceReminder($student, $invoices, $totalDue, $recipientName));
            $sent++;
        }

        $this->info("Relances envoyées : {$sent}. Sans contact e-mail : {$skippedNoContact}.");

        return self::SUCCESS;
    }
}

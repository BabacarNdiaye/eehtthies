<?php

namespace App\Services;

use App\Mail\OverdueInvoiceReminder;
use App\Models\Invoice;
use App\Models\PaymentReminder;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Relance une famille pour ses factures en retard (ou, en option, sur le point d'échoir) : e-mail, notification de
 * l'application et message dans EEHT Connect. Un seul message, qui cite toutes les factures concernées. Chaque canal
 * est indépendant (un échec est journalisé sans bloquer les autres) et chaque envoi est inscrit au journal
 * `payment_reminders`, qui sert aussi de verrou : un palier ne part jamais deux fois pour une même facture.
 */
class PaymentReminderSender
{
    public function __construct(private readonly FamilyChannels $family) {}

    /**
     * @param  Collection<int, Invoice>  $invoices  les factures de l'élève à citer, chacune avec `computed_balance`
     * @param  array<int, int>  $milestones  palier déclenché par facture (id de facture => palier) ; vide pour une relance manuelle
     * @return list<string> canaux atteints parmi « mail », « push » et « connect » ; vide si rien n'est parti (aucun contact, ou palier déjà envoyé)
     */
    public function send(Student $student, Collection $invoices, string $kind, array $milestones = [], ?User $by = null): array
    {
        if ($invoices->isEmpty() || ! $this->family->canReach($student)) {
            return [];
        }

        $rows = $this->claim($student, $invoices, $kind, $milestones, $by);

        if ($rows === null) {
            return [];
        }

        $used = $this->deliver($student, $invoices);

        if ($used === []) {
            // Rien n'est parti : on ne laisse pas au journal un palier qui n'a pas eu lieu.
            $rows->each->delete();

            return [];
        }

        $rows->each->update(['channels' => $used]);

        return $used;
    }

    /** La famille de cet élève a-t-elle déjà reçu une relance depuis cet instant (automatique ou manuelle) ? */
    public function remindedSince(Student $student, CarbonInterface $since): bool
    {
        return PaymentReminder::where('student_id', $student->id)->where('created_at', '>=', $since)->exists();
    }

    /**
     * Réserve au journal les lignes de cet envoi avant d'envoyer quoi que ce soit : deux exécutions simultanées ne
     * peuvent pas relancer deux fois le même palier (la contrainte d'unicité refuse la seconde).
     *
     * @return Collection<int, PaymentReminder>|null null quand un palier est déjà réservé
     */
    private function claim(Student $student, Collection $invoices, string $kind, array $milestones, ?User $by): ?Collection
    {
        $today = Carbon::today();

        try {
            return DB::transaction(fn () => $invoices->map(fn (Invoice $invoice) => PaymentReminder::create([
                'invoice_id' => $invoice->id,
                'student_id' => $student->id,
                'kind' => $kind,
                'milestone' => $milestones[$invoice->id] ?? null,
                'days_overdue' => $invoice->daysPastDue($today) ?? 0,
                'balance' => $invoice->computed_balance,
                'sent_by' => $by?->id,
            ]))->values());
        } catch (UniqueConstraintViolationException) {
            return null;
        }
    }

    /** @return list<string> */
    private function deliver(Student $student, Collection $invoices): array
    {
        $today = Carbon::today();
        $total = round((float) $invoices->sum('computed_balance'), 2);
        $upcoming = $invoices->every(fn (Invoice $invoice) => ($invoice->daysPastDue($today) ?? 0) < 0);
        $count = $invoices->count() === 1 ? '1 facture' : $invoices->count().' factures';
        $amount = number_format($total, 0, ',', ' ').' FCFA';
        $used = [];

        if ($address = $this->family->mailAddress($student)) {
            try {
                Mail::to($address)->send(new OverdueInvoiceReminder($student, $invoices, $total, $this->family->recipientName($student), $upcoming));
                $used[] = 'mail';
            } catch (Throwable $e) {
                report($e);
            }
        }

        $accounts = $this->family->accounts($student);

        if ($accounts->isEmpty()) {
            return $used;
        }

        if ($upcoming) {
            $days = abs((int) $invoices->map(fn (Invoice $invoice) => $invoice->daysPastDue($today))->min());
            $when = $days === 1 ? 'demain' : "dans {$days} jours";
            $title = 'Échéance proche';
            // Le montant n'apparaît pas sur l'écran verrouillé : il se lit dans l'application.
            $push = "{$student->first_name} : {$count} à régler {$when}. Ouvrez l'application pour le détail.";
            $connect = "📅 Échéance proche : {$count} à régler {$when} pour {$student->first_name}, soit {$amount}. Le détail est dans « Factures ».";
        } else {
            $title = 'Rappel de paiement';
            $push = "{$student->first_name} : {$count} en retard. Ouvrez l'application pour le détail.";
            $connect = "⏰ Rappel de paiement : {$count} en retard pour {$student->first_name}, soit {$amount}. Le détail est dans « Factures ».";
        }

        foreach ($accounts as $user) {
            SafePush::send($user, $title, $push, $this->family->invoicesUrl($user, $student));
        }
        $used[] = 'push';

        $posted = false;
        foreach ($accounts as $user) {
            $posted = $this->family->postToConnect($user, $connect, ['type' => 'payment_reminder', 'upcoming' => $upcoming]) || $posted;
        }

        if ($posted) {
            $used[] = 'connect';
        }

        return $used;
    }
}

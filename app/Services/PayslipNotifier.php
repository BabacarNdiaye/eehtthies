<?php

namespace App\Services;

use App\Mail\PayslipAvailable;
use App\Models\PayrollLine;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Avertit une personne que son salaire est versé et que son bulletin est disponible : e-mail, notification de
 * l'application et message EEHT Connect. Jamais de montant ni de compte dans ces messages. Chaque canal est indépendant :
 * un échec est journalisé sans empêcher les autres, ni le paiement lui-même.
 */
class PayslipNotifier
{
    public function __construct(private readonly FamilyChannels $channels) {}

    /** @return list<string> canaux utilisés parmi « mail », « push » et « connect » */
    public function paid(PayrollLine $line): array
    {
        $line->loadMissing('run', 'user', 'teacher.user');

        $account = $line->user ?? $line->teacher?->user;
        $period = $line->run->label;
        // En milieu de phrase le mois prend une minuscule (« pour octobre 2026 »).
        $inSentence = mb_strtolower($period);
        $routeName = $line->user_id ? 'admin.my-payslips.index' : 'teacher.payslips.index';
        $used = [];

        if ($address = $this->mailAddress($line, $account)) {
            try {
                Mail::to($address)->send(new PayslipAvailable($line->name, $period, route($routeName)));
                $used[] = 'mail';
            } catch (Throwable $e) {
                report($e);
            }
        }

        if (! $account) {
            return $used;
        }

        SafePush::send(
            $account,
            'Bulletin de paie disponible',
            "Votre bulletin de paie pour {$inSentence} est disponible dans « Ma paie ».",
            route($routeName, [], false),
        );
        $used[] = 'push';

        if ($this->channels->postToConnect($account, "💼 Bulletin de paie disponible : votre bulletin pour {$inSentence} est consultable dans « Ma paie ».", ['type' => 'payslip'])) {
            $used[] = 'connect';
        }

        return $used;
    }

    /** Le compte (ou, à défaut, l'adresse de l'enseignant sans compte) où prévenir la personne. */
    private function mailAddress(PayrollLine $line, ?User $account): ?string
    {
        return collect([
            $account?->email,
            $line->teacher?->professional_email,
            $line->teacher?->email,
            $line->user?->personal_email,
        ])->first(fn ($address) => filled($address));
    }
}

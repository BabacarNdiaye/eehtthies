<?php

namespace App\Console\Commands;

use App\Services\OnlinePayments;
use Illuminate\Console\Command;

class ReconcilePaymentAttempts extends Command
{
    protected $signature = 'app:reconcile-payment-attempts';

    protected $description = 'Interroge le fournisseur sur les paiements en ligne en cours et expire ceux qui ont dépassé leur délai';

    public function handle(OnlinePayments $online): int
    {
        $result = $online->reconcile();

        $this->info("{$result['settled']} paiement(s) confirmé(s), {$result['expired']} tentative(s) expirée(s).");

        return self::SUCCESS;
    }
}

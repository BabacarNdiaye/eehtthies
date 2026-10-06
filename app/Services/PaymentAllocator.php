<?php

namespace App\Services;

/**
 * Répartit une somme reçue sur des factures, dans l'ordre donné (les plus anciennes d'abord), sans jamais dépasser un
 * solde. Les calculs se font en centimes entiers : 0,1 + 0,2 ne laisse pas de miettes de virgule flottante.
 */
final class PaymentAllocator
{
    /**
     * @param  array<int, int|float|string>  $balances  identifiant de facture => solde, dans l'ordre de règlement
     * @return array{allocations: array<int, float>, leftover: float} part de chaque facture touchée, et reste non réparti
     */
    public static function allocate(array $balances, int|float|string $amount): array
    {
        $remaining = self::cents($amount);
        $allocations = [];

        foreach ($balances as $invoiceId => $balance) {
            if ($remaining <= 0) {
                break;
            }

            $due = self::cents($balance);

            if ($due <= 0) {
                continue;
            }

            $part = min($due, $remaining);
            $allocations[$invoiceId] = $part / 100.0;
            $remaining -= $part;
        }

        return ['allocations' => $allocations, 'leftover' => max($remaining, 0) / 100.0];
    }

    /** Montant en centimes entiers (arrondi au centime le plus proche). */
    public static function cents(int|float|string $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}

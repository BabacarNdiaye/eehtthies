<?php

namespace Tests\Unit;

use App\Services\PaymentAllocator;
use PHPUnit\Framework\TestCase;

/**
 * Quand une famille règle plusieurs mois d'un coup, la somme est répartie sur les factures dans l'ordre reçu (les
 * plus anciennes d'abord) sans jamais dépasser un solde. Les calculs se font en centimes entiers : 0,1 + 0,2 ne
 * doit pas laisser de miettes.
 */
class PaymentAllocatorTest extends TestCase
{
    public function test_the_oldest_invoice_is_settled_first(): void
    {
        $result = PaymentAllocator::allocate([10 => 25000, 11 => 25000, 12 => 25000], 60000);

        $this->assertSame([10 => 25000.0, 11 => 25000.0, 12 => 10000.0], $result['allocations']);
        $this->assertSame(0.0, $result['leftover']);
    }

    public function test_an_amount_below_the_first_balance_is_a_partial_payment(): void
    {
        $result = PaymentAllocator::allocate([10 => 25000, 11 => 25000], 9000);

        $this->assertSame([10 => 9000.0], $result['allocations']);
        $this->assertSame(0.0, $result['leftover']);
    }

    public function test_an_amount_above_the_total_never_exceeds_a_balance_and_reports_the_leftover(): void
    {
        $result = PaymentAllocator::allocate([10 => 25000, 11 => 5000], 40000);

        $this->assertSame([10 => 25000.0, 11 => 5000.0], $result['allocations']);
        $this->assertSame(10000.0, $result['leftover']);
    }

    public function test_cents_are_summed_without_floating_point_drift(): void
    {
        $result = PaymentAllocator::allocate([1 => 33333.33, 2 => 33333.33, 3 => 33333.34], 100000);

        $this->assertSame([1 => 33333.33, 2 => 33333.33, 3 => 33333.34], $result['allocations']);
        $this->assertSame(0.0, $result['leftover']);

        // L'addition naïve de 0,1 et 0,2 donne 0,30000000000000004.
        $result = PaymentAllocator::allocate([1 => 0.1, 2 => 0.2], 0.3);

        $this->assertSame([1 => 0.1, 2 => 0.2], $result['allocations']);
        $this->assertSame(0.0, $result['leftover']);
    }

    public function test_settled_invoices_and_empty_amounts_are_skipped(): void
    {
        $nothingOwed = PaymentAllocator::allocate([10 => 0, 11 => -5], 1000);
        $this->assertSame([], $nothingOwed['allocations']);
        $this->assertSame(1000.0, $nothingOwed['leftover']);

        $this->assertSame([], PaymentAllocator::allocate([10 => 25000], 0)['allocations']);
        $this->assertSame([11 => 500.0], PaymentAllocator::allocate([10 => 0, 11 => 25000], 500)['allocations']);
    }
}

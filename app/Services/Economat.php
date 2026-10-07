<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\SupplyRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Règles de l'économat : réception des commandes, livraison des demandes de matériel et inventaire. Chaque opération
 * passe par StockMovement, qui tient le stock et le coût moyen pondéré à jour.
 */
class Economat
{
    /**
     * Réceptionne tout ou partie d'un bon de commande : une entrée de stock par ligne reçue, au prix du bon.
     *
     * @param  array<int, float|string>  $received  quantité reçue par id de ligne (les lignes absentes ou à 0 sont ignorées)
     */
    public function receive(PurchaseOrder $order, array $received, User $by): PurchaseOrder
    {
        if (! $order->isOpen()) {
            throw ValidationException::withMessages(['lines' => "Ce bon n'est pas en attente de réception."]);
        }

        return DB::transaction(function () use ($order, $received, $by) {
            $any = false;

            foreach ($order->lines()->with('product')->get() as $line) {
                $quantity = round((float) ($received[$line->id] ?? 0), 2);

                if ($quantity <= 0) {
                    continue;
                }

                if ($quantity > $line->remaining + 0.001) {
                    throw ValidationException::withMessages(['lines' => "« {$line->product->name} » : {$quantity} reçu(s) pour {$line->remaining} attendu(s)."]);
                }

                StockMovement::create([
                    'product_id' => $line->product_id,
                    'type' => 'entree',
                    'quantity' => $quantity,
                    'unit_cost' => $line->unit_cost,
                    'reference' => $order->number,
                    'reason' => 'Réception du bon de commande '.$order->number,
                    'recorded_by' => $by->id,
                    'movement_date' => today(),
                ]);

                $line->increment('received_quantity', $quantity);
                $any = true;
            }

            if (! $any) {
                throw ValidationException::withMessages(['lines' => 'Indiquez au moins une quantité reçue.']);
            }

            $order->load('lines');
            $complete = $order->lines->every(fn ($l) => (float) $l->received_quantity + 0.001 >= (float) $l->quantity);
            $order->update(['status' => $complete ? 'recu' : 'partiel', 'received_at' => $complete ? today() : null]);

            return $order;
        });
    }

    /** Enregistre en dépense (rubrique « Achats ») la valeur reçue d'un bon, une seule fois. */
    public function recordExpense(PurchaseOrder $order, string $method, User $by): Expense
    {
        $order->load('lines', 'supplier');

        if ($order->expense_id) {
            throw ValidationException::withMessages(['expense' => 'La dépense de ce bon est déjà enregistrée.']);
        }

        if ($order->received_total <= 0) {
            throw ValidationException::withMessages(['expense' => "Rien n'a encore été reçu sur ce bon."]);
        }

        $expense = Expense::create([
            'category' => 'achats',
            'label' => 'Achats — bon de commande '.$order->number,
            'amount' => $order->received_total,
            'expense_date' => today(),
            'payment_method' => $method,
            'supplier_name' => $order->supplier->name,
            'recorded_by' => $by->id,
        ]);

        $order->update(['expense_id' => $expense->id]);

        return $expense;
    }

    /** Livre une demande approuvée : une sortie de stock par ligne, refusée en bloc si un article manque. */
    public function deliver(SupplyRequest $request, User $by): SupplyRequest
    {
        if ($request->status !== 'approuvee') {
            throw ValidationException::withMessages(['status' => "Seule une demande approuvée peut être livrée."]);
        }

        return DB::transaction(function () use ($request, $by) {
            $request->load('lines.product', 'schoolClass');
            $missing = [];

            foreach ($request->lines as $line) {
                $stock = (float) Product::whereKey($line->product_id)->lockForUpdate()->value('quantity_in_stock');

                if ((float) $line->quantity > $stock + 0.001) {
                    $missing[] = "« {$line->product->name} » : {$stock} en stock pour {$line->quantity} demandé(s)";
                }
            }

            if ($missing) {
                throw ValidationException::withMessages(['status' => 'Stock insuffisant — '.implode(' ; ', $missing).'.']);
            }

            foreach ($request->lines as $line) {
                StockMovement::create([
                    'product_id' => $line->product_id,
                    'type' => 'sortie',
                    'quantity' => $line->quantity,
                    'reference' => $request->number,
                    'reason' => 'Demande '.$request->number.' — '.($request->schoolClass?->name ?? $request->purpose),
                    'recorded_by' => $by->id,
                    'movement_date' => today(),
                ]);

                $line->update(['delivered_quantity' => $line->quantity]);
            }

            $request->update(['status' => 'livree', 'delivered_at' => now()]);

            return $request;
        });
    }

    /**
     * Applique un inventaire : pour chaque article compté différemment du stock théorique, un ajustement à la quantité comptée.
     *
     * @param  array<int, float|string|null>  $counted  quantité comptée par id d'article (vide = non compté)
     * @return int nombre d'écarts régularisés
     */
    public function applyInventory(array $counted, User $by, ?string $label = null): int
    {
        $changes = 0;

        DB::transaction(function () use ($counted, $by, $label, &$changes) {
            foreach (Product::whereIn('id', array_keys($counted))->get() as $product) {
                $value = $counted[$product->id] ?? null;

                if ($value === null || $value === '') {
                    continue;
                }

                $quantity = round((float) $value, 2);

                if (abs($quantity - (float) $product->quantity_in_stock) < 0.005) {
                    continue;
                }

                StockMovement::create([
                    'product_id' => $product->id,
                    'type' => 'ajustement',
                    'quantity' => $quantity,
                    'reference' => 'INV-'.now()->format('Ymd'),
                    'reason' => $label ?: 'Inventaire du '.now()->format('d/m/Y'),
                    'recorded_by' => $by->id,
                    'movement_date' => today(),
                ]);

                $changes++;
            }
        });

        return $changes;
    }
}

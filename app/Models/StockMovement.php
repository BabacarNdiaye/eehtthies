<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id', 'type', 'quantity', 'unit_cost', 'reference',
        'reason', 'recorded_by', 'movement_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'movement_date' => 'date',
    ];

    public const TYPES = [
        'entree' => 'Entrée',
        'sortie' => 'Sortie',
        'ajustement' => 'Ajustement (nouvelle quantité)',
    ];

    protected static function booted(): void
    {
        static::created(function (StockMovement $movement) {
            $product = $movement->product;

            if ($movement->type === 'entree') {
                $oldQty = (float) $product->quantity_in_stock;
                $newQty = (float) $movement->quantity;
                $newCost = $movement->unit_cost !== null ? (float) $movement->unit_cost : (float) $product->unit_cost;

                $totalQty = $oldQty + $newQty;
                $weightedCost = $totalQty > 0
                    ? (($oldQty * (float) $product->unit_cost) + ($newQty * $newCost)) / $totalQty
                    : $newCost;

                $product->update([
                    'quantity_in_stock' => $totalQty,
                    'unit_cost' => round($weightedCost, 2),
                ]);
            } elseif ($movement->type === 'sortie') {
                $product->update([
                    'quantity_in_stock' => max(0, (float) $product->quantity_in_stock - (float) $movement->quantity),
                ]);
            } elseif ($movement->type === 'ajustement') {
                $product->update(['quantity_in_stock' => (float) $movement->quantity]);
            }
        });
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

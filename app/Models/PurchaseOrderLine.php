<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderLine extends Model
{
    protected $fillable = ['purchase_order_id', 'product_id', 'quantity', 'unit_cost', 'received_quantity'];

    protected $casts = ['quantity' => 'decimal:2', 'unit_cost' => 'decimal:2', 'received_quantity' => 'decimal:2'];

    public function order()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getRemainingAttribute(): float
    {
        return max(0, round((float) $this->quantity - (float) $this->received_quantity, 2));
    }
}

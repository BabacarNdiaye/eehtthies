<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplyRequestLine extends Model
{
    protected $fillable = ['supply_request_id', 'product_id', 'quantity', 'delivered_quantity'];

    protected $casts = ['quantity' => 'decimal:2', 'delivered_quantity' => 'decimal:2'];

    public function request()
    {
        return $this->belongsTo(SupplyRequest::class, 'supply_request_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

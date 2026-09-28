<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PracticalSessionItem extends Model
{
    protected $fillable = ['practical_session_id', 'product_id', 'quantity_used', 'unit_cost_at_time'];

    protected $casts = [
        'quantity_used' => 'decimal:2',
        'unit_cost_at_time' => 'decimal:2',
    ];

    public function practicalSession()
    {
        return $this->belongsTo(PracticalSession::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $fillable = ['number', 'supplier_id', 'status', 'ordered_at', 'expected_at', 'received_at', 'notes', 'created_by', 'expense_id'];

    protected $casts = ['ordered_at' => 'date', 'expected_at' => 'date', 'received_at' => 'date'];

    public const STATUSES = [
        'brouillon' => 'Brouillon',
        'envoye' => 'Envoyé',
        'partiel' => 'Reçu en partie',
        'recu' => 'Reçu',
        'annule' => 'Annulé',
    ];

    protected static function booted(): void
    {
        static::creating(function (PurchaseOrder $order) {
            $order->number ??= self::nextNumber();
        });
    }

    public static function nextNumber(): string
    {
        $prefix = 'BC-'.now()->format('Y').'-';
        $last = static::where('number', 'like', $prefix.'%')->orderByDesc('number')->value('number');
        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function lines()
    {
        return $this->hasMany(PurchaseOrderLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }

    public function getTotalAttribute(): float
    {
        return round($this->lines->sum(fn (PurchaseOrderLine $l) => (float) $l->quantity * (float) $l->unit_cost), 2);
    }

    public function getReceivedTotalAttribute(): float
    {
        return round($this->lines->sum(fn (PurchaseOrderLine $l) => (float) $l->received_quantity * (float) $l->unit_cost), 2);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['envoye', 'partiel'], true);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;

class Payment extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('comptabilite');
    }

    protected $fillable = [
        'receipt_number', 'invoice_id', 'amount', 'method', 'reference',
        'paid_at', 'notes', 'received_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    public const METHODS = [
        'especes' => 'Espèces',
        'virement' => 'Virement bancaire',
        'mobile_money' => 'Mobile Money',
        'autre' => 'Autre',
    ];

    protected static function booted(): void
    {
        static::creating(function (Payment $payment) {
            if (empty($payment->receipt_number)) {
                $payment->receipt_number = 'REC-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            }
        });

        static::created(fn (Payment $payment) => \App\Support\AccountingPoster::postPayment($payment));
        static::deleted(fn (Payment $payment) => \App\Support\AccountingPoster::void($payment));
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}

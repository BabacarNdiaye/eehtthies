<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;

class Expense extends Model
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
        'category', 'label', 'amount', 'expense_date', 'payment_method',
        'supplier_name', 'notes', 'recorded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    public const CATEGORIES = [
        'salaires' => 'Salaires',
        'fournisseurs' => 'Fournisseurs',
        'achats' => 'Achats',
        'charges' => 'Charges',
        'maintenance' => 'Maintenance',
        'transport' => 'Transport',
        'evenements' => 'Événements',
        'autres' => 'Autres',
    ];

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    protected static function booted(): void
    {
        static::created(fn (Expense $expense) => \App\Support\AccountingPoster::postExpense($expense));
        static::updated(function (Expense $expense) {
            if ($expense->wasChanged(['amount', 'category', 'payment_method', 'expense_date', 'label'])) {
                \App\Support\AccountingPoster::postExpense($expense);
            }
        });
        static::deleted(fn (Expense $expense) => \App\Support\AccountingPoster::void($expense));
    }
}

<?php

namespace App\Models;

use App\Notifications\PushAlert;
use App\Support\AccountingPoster;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Invoice extends Model
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
        'reference', 'student_id', 'payment_plan_id', 'academic_year_id', 'type', 'period_month', 'label',
        'amount', 'discount', 'due_date', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'due_date' => 'date',
    ];

    public const TYPES = [
        'inscription' => "Frais d'inscription",
        'scolarite' => 'Frais de scolarité',
        'mensualite' => 'Mensualité',
        'autre' => 'Autre',
    ];

    /** Default school-year month sequence (Sept → June) used for monthly tuition generation. */
    public const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

    public const MONTH_LABELS = [
        1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
        5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
        9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre',
    ];

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (empty($invoice->reference)) {
                $invoice->reference = 'FACT-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            }
        });

        static::created(function (Invoice $invoice) {
            AccountingPoster::postInvoice($invoice);

            $invoice->student?->user?->notify(new PushAlert(
                'Nouvelle facture',
                "{$invoice->label} — ".number_format((float) $invoice->amount, 0, ',', ' ').' FCFA',
                '/espace-eleve/factures'
            ));
        });
        static::updated(function (Invoice $invoice) {
            if ($invoice->wasChanged(['amount', 'discount', 'type', 'label'])) {
                AccountingPoster::postInvoice($invoice);
            }
        });
        static::deleted(fn (Invoice $invoice) => AccountingPoster::void($invoice));
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function paymentPlan()
    {
        return $this->belongsTo(PaymentPlan::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function getNetAmountAttribute(): float
    {
        return (float) $this->amount - (float) $this->discount;
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function getBalanceAttribute(): float
    {
        return round($this->net_amount - $this->paid_amount, 2);
    }

    public function getPeriodLabelAttribute(): ?string
    {
        return $this->period_month ? self::MONTH_LABELS[$this->period_month] : null;
    }

    public function getStatusAttribute(): string
    {
        if ($this->balance <= 0) {
            return 'payee';
        }

        if ($this->paid_amount > 0) {
            return 'partielle';
        }

        return 'impayee';
    }
}

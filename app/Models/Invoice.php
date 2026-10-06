<?php

namespace App\Models;

use App\Models\Concerns\HasAttachments;
use App\Notifications\PushAlert;
use App\Support\AccountingPoster;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Invoice extends Model
{
    use HasAttachments, LogsActivity;

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

    /** Séquence de mois par défaut de l'année scolaire (sept. → juin) utilisée pour générer les mensualités. */
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

    /**
     * Factures dont il reste quelque chose à payer, la plus grosse dette d'abord. Chacune porte `computed_balance`
     * (montant − remise − paiements). Source unique de la page « Situation des impayés » et du tableau de bord.
     *
     * @param  bool  $withStudent  Charger l'élève (nom, matricule, contact) : inutile pour un simple total.
     * @return Collection<int, static>
     */
    public static function outstanding(bool $withStudent = true): Collection
    {
        $query = static::query()->withSum('payments', 'amount');

        if ($withStudent) {
            $query->with('student:id,first_name,last_name,matricule,phone,email');
        }

        return $query->get()
            ->map(function (Invoice $invoice) {
                $paid = (float) ($invoice->payments_sum_amount ?? 0);
                $net = (float) $invoice->amount - (float) $invoice->discount;
                $invoice->computed_balance = round($net - $paid, 2);

                return $invoice;
            })
            ->filter(fn (Invoice $invoice) => $invoice->computed_balance > 0)
            ->sortByDesc('computed_balance')
            ->values();
    }

    /**
     * Échéance d'une mensualité : le `$day` du mois scolaire `$month` (1 à 12), dans la bonne année civile. L'année
     * scolaire court de sa date de début (septembre en général) à sa fin : les mois qui précèdent la date de début
     * tombent l'année suivante. Sans année académique connue, on suppose l'année scolaire en cours (qui démarre en
     * septembre). Le jour est ramené à la longueur du mois : le 31 février n'existe pas.
     */
    public static function dueDateFor(?AcademicYear $year, int $month, int $day): CarbonImmutable
    {
        $start = $year?->start_date
            ? CarbonImmutable::instance($year->start_date)->startOfMonth()
            : CarbonImmutable::create(now()->month >= 9 ? now()->year : now()->year - 1, 9, 1);

        $first = CarbonImmutable::create($start->year, $month, 1);

        if ($first->lt($start)) {
            $first = $first->addYear();
        }

        return $first->day(min($day, $first->daysInMonth));
    }

    /**
     * Factures qu'il reste à payer pour un élève, dans l'ordre où l'on règle : échéance la plus ancienne d'abord (les
     * factures sans échéance à la fin), puis année scolaire, puis mois scolaire. Chacune porte `computed_balance`
     * (montant − remise − paiements).
     *
     * @return Collection<int, static>
     */
    public static function openForStudent(Student $student): Collection
    {
        $monthOrder = array_flip(self::SCHOOL_MONTHS);

        return static::query()
            ->where('student_id', $student->id)
            ->withSum('payments', 'amount')
            ->with('academicYear:id,start_date')
            ->get()
            ->map(function (Invoice $invoice) {
                $invoice->computed_balance = round($invoice->net_amount - (float) ($invoice->payments_sum_amount ?? 0), 2);

                return $invoice;
            })
            ->filter(fn (Invoice $invoice) => $invoice->computed_balance > 0)
            ->sortBy([
                fn (Invoice $a, Invoice $b) => ($a->due_date?->timestamp ?? PHP_INT_MAX) <=> ($b->due_date?->timestamp ?? PHP_INT_MAX),
                fn (Invoice $a, Invoice $b) => ($a->academicYear?->start_date?->timestamp ?? 0) <=> ($b->academicYear?->start_date?->timestamp ?? 0),
                fn (Invoice $a, Invoice $b) => ($monthOrder[$a->period_month] ?? 99) <=> ($monthOrder[$b->period_month] ?? 99),
                fn (Invoice $a, Invoice $b) => $a->id <=> $b->id,
            ])
            ->values();
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

    public function reminders()
    {
        return $this->hasMany(PaymentReminder::class);
    }

    /** Jours écoulés depuis l'échéance (négatif avant l'échéance) ; null pour une facture sans échéance. */
    public function daysPastDue(?CarbonInterface $today = null): ?int
    {
        if (! $this->due_date) {
            return null;
        }

        return (int) round($this->due_date->copy()->startOfDay()->diffInDays($today ?? Carbon::today(), false));
    }

    /** Pose `computed_balance` (montant − remise − paiements) à partir de `payments_sum_amount`, que `withSum('payments', 'amount')` charge. */
    public function withComputedBalance(): static
    {
        $this->computed_balance = round($this->net_amount - (float) ($this->payments_sum_amount ?? 0), 2);

        return $this;
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

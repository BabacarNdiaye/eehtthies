<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Cycle de paie d'un mois : préparé en brouillon (heures, primes, retenues à vérifier), validé par une personne
 * habilitée, puis payé ligne par ligne. Rien n'est versé tant que le cycle n'est pas validé.
 */
class PayrollRun extends Model
{
    public const DRAFT = 'brouillon';

    public const VALIDATED = 'validee';

    protected $fillable = ['period_year', 'period_month', 'status', 'created_by', 'validated_by', 'validated_at'];

    protected $casts = [
        'period_year' => 'integer',
        'period_month' => 'integer',
        'validated_at' => 'datetime',
    ];

    public function lines()
    {
        return $this->hasMany(PayrollLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function isDraft(): bool
    {
        return $this->status === self::DRAFT;
    }

    public function isValidated(): bool
    {
        return $this->status === self::VALIDATED;
    }

    /** « Octobre 2026 » */
    public function getLabelAttribute(): string
    {
        return Invoice::MONTH_LABELS[$this->period_month].' '.$this->period_year;
    }

    /** « d'octobre 2026 », « de mars 2026 » : pour les phrases du type « la paie d'octobre 2026 ». */
    public function getOfLabelAttribute(): string
    {
        $month = mb_strtolower(Invoice::MONTH_LABELS[$this->period_month]);

        return (preg_match('/^[aeiouyéèh]/u', $month) ? "d'" : 'de ').$month.' '.$this->period_year;
    }
}

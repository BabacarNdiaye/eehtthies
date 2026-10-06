<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Journal des relances de paiement : une ligne par facture citée dans un message envoyé à la famille. Le couple
 * (facture, palier) est unique, ce qui empêche un même palier de partir deux fois.
 */
class PaymentReminder extends Model
{
    public const KIND_AUTO = 'auto';

    public const KIND_MANUAL = 'manual';

    /** Jours de retard auxquels une relance automatique part. */
    public const MILESTONES = [3, 7, 15, 30, 60];

    /** Palier du rappel envoyé avant l'échéance (en option) : trois jours avant. */
    public const BEFORE_DUE = -3;

    protected $fillable = [
        'invoice_id', 'student_id', 'kind', 'milestone', 'days_overdue', 'balance', 'channels', 'sent_by',
    ];

    protected $casts = [
        'milestone' => 'integer',
        'days_overdue' => 'integer',
        'balance' => 'decimal:2',
        'channels' => 'array',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function sentBy()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}

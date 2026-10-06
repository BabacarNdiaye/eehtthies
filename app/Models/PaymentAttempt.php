<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Une tentative de paiement en ligne d'un élève : elle ne devient un encaissement que lorsque le fournisseur la confirme.
 * La référence (aléatoire, impossible à deviner) sert d'adresse publique de la tentative ; le jeton du lot, lui, n'apparaît
 * jamais dans les adresses des pages de suivi.
 */
class PaymentAttempt extends Model
{
    public const INITIATED = 'initiated';

    public const PENDING = 'pending';

    public const SUCCEEDED = 'succeeded';

    public const FAILED = 'failed';

    public const EXPIRED = 'expired';

    /** Quelque chose cloche (montant différent, facture déjà réglée) : rien n'a été encaissé, le personnel doit regarder. */
    public const ANOMALY = 'anomaly';

    public const STATUS_LABELS = [
        self::INITIATED => 'Démarré',
        self::PENDING => 'En attente',
        self::SUCCEEDED => 'Payé',
        self::FAILED => 'Échoué',
        self::EXPIRED => 'Expiré',
        self::ANOMALY => 'À vérifier',
    ];

    protected $fillable = [
        'reference', 'student_id', 'initiated_by', 'driver', 'channel', 'amount', 'allocations', 'status', 'provider_reference',
        'checkout_url', 'batch_token', 'note', 'expires_at', 'settled_at',
    ];

    /** Ni le jeton du lot ni l'adresse de paiement ne sortent avec la tentative : les pages les choisissent. */
    protected $hidden = ['batch_token', 'checkout_url'];

    protected $casts = [
        'amount' => 'decimal:2',
        'allocations' => 'array',
        'expires_at' => 'datetime',
        'settled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (PaymentAttempt $attempt) {
            $attempt->reference ??= 'PAY-'.strtoupper(Str::random(12));
        });
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    /** Pas encore tranchée : le fournisseur peut encore la confirmer. */
    public function isOpen(): bool
    {
        return in_array($this->status, [self::INITIATED, self::PENDING], true);
    }

    /** Ouverte et dans son délai : le payeur peut encore y revenir. */
    public function canResume(): bool
    {
        return $this->isOpen() && $this->checkout_url && $this->expires_at?->isFuture();
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }
}

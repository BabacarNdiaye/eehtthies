<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Appel audio ou vidéo entre les deux participants d'une conversation privée.
 */
class Call extends Model
{
    public const TYPES = ['audio', 'video'];

    /** Au-delà, un appel resté sans réponse est considéré comme manqué. */
    public const RING_TIMEOUT_SECONDS = 45;

    public const OPEN_STATUSES = ['ringing', 'active'];

    protected $fillable = ['conversation_id', 'caller_id', 'callee_id', 'type', 'status', 'answered_at', 'ended_at', 'remind_at', 'reminded_at'];

    protected $casts = [
        'answered_at' => 'datetime',
        'ended_at' => 'datetime',
        'remind_at' => 'datetime',
        'reminded_at' => 'datetime',
    ];

    /** Délais proposés pour « Me le rappeler » (en minutes). */
    public const REMIND_DELAYS = [10, 60];

    /** Types de messages de mise en relation échangés entre les navigateurs. */
    public const SIGNAL_TYPES = ['offer', 'answer', 'candidate', 'state'];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function caller()
    {
        return $this->belongsTo(User::class, 'caller_id');
    }

    public function callee()
    {
        return $this->belongsTo(User::class, 'callee_id');
    }

    public function signals()
    {
        return $this->hasMany(CallSignal::class);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function involves(int $userId): bool
    {
        return $this->caller_id === $userId || $this->callee_id === $userId;
    }

    public function otherParty(int $userId): int
    {
        return $this->caller_id === $userId ? $this->callee_id : $this->caller_id;
    }

    public function ringExpired(): bool
    {
        return $this->status === 'ringing' && $this->created_at->lt(now()->subSeconds(self::RING_TIMEOUT_SECONDS));
    }
}

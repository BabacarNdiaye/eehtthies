<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationParticipant extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'is_admin', 'is_favorite', 'last_read_message_id', 'muted_until'];

    protected $casts = [
        'is_admin' => 'boolean',
        'is_favorite' => 'boolean',
        'muted_until' => 'datetime',
    ];

    /** « Toujours » : sourdine jusqu'à une date très lointaine. */
    public const MUTED_FOREVER = '2100-01-01 00:00:00';

    public function isMuted(): bool
    {
        return $this->muted_until !== null && $this->muted_until->isFuture();
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

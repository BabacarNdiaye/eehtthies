<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Conversation EEHT Connect : privée (deux personnes) ou groupe. Un groupe
 * lié à une classe (school_class_id) voit ses membres synchronisés
 * automatiquement par App\Services\ClassGroupSync.
 */
class Conversation extends Model
{
    public const TYPE_DIRECT = 'direct';

    public const TYPE_GROUP = 'group';

    /** Conversation personnelle où EEHT Connect dépose les rappels et alertes d'un utilisateur. */
    public const TYPE_ASSISTANT = 'assistant';

    protected $fillable = ['type', 'name', 'description', 'school_class_id', 'created_by', 'last_message_at', 'avatar_path', 'only_admins_can_write'];

    protected $casts = [
        'last_message_at' => 'datetime',
        'only_admins_can_write' => 'boolean',
    ];

    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot(['is_admin', 'is_favorite', 'last_read_message_id', 'muted_until'])
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(ConversationMessage::class);
    }

    public function latestMessage()
    {
        return $this->hasOne(ConversationMessage::class)->latestOfMany();
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function isDirect(): bool
    {
        return $this->type === self::TYPE_DIRECT;
    }

    public function isAssistant(): bool
    {
        return $this->type === self::TYPE_ASSISTANT;
    }

    public function isClassGroup(): bool
    {
        return $this->school_class_id !== null;
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? '/storage/'.ltrim($this->avatar_path, '/') : null;
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->whereHas('participants', fn ($q) => $q->where('user_id', $userId));
    }

    /** Conversation privée existante entre deux personnes, s'il y en a une. */
    public static function directBetween(int $userA, int $userB): ?self
    {
        return static::where('type', self::TYPE_DIRECT)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userA))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userB))
            ->first();
    }
}

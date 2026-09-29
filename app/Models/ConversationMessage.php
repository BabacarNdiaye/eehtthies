<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationMessage extends Model
{
    public const KIND_USER = 'user';

    /** Message automatique d'EEHT Connect (rappel, alerte), sans auteur. */
    public const KIND_SYSTEM = 'system';

    /** Délai pendant lequel l'auteur peut modifier son message (minutes). */
    public const EDIT_WINDOW_MINUTES = 15;

    /** Délai pendant lequel l'auteur peut supprimer son message pour tout le monde (minutes). */
    public const RETRACT_WINDOW_MINUTES = 24 * 60;

    protected $fillable = [
        'conversation_id', 'user_id', 'reply_to_id', 'kind', 'subject', 'body',
        'attachment_path', 'attachment_name', 'attachment_size', 'attachment_mime',
        'meta', 'pinned_at', 'pinned_by', 'pushed_at', 'edited_at', 'retracted_at', 'retracted_by',
    ];

    protected $casts = [
        'meta' => 'array',
        'pinned_at' => 'datetime',
        'pushed_at' => 'datetime',
        'edited_at' => 'datetime',
        'retracted_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function replyTo()
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }

    public function reactions()
    {
        return $this->hasMany(MessageReaction::class);
    }

    public function mentions()
    {
        return $this->belongsToMany(User::class, 'message_mentions');
    }

    public function isSystem(): bool
    {
        return $this->kind === self::KIND_SYSTEM;
    }

    public function isRetracted(): bool
    {
        return $this->retracted_at !== null;
    }

    /** L'auteur peut encore modifier ce message (texte, dans le délai). */
    public function editableBy(int $userId): bool
    {
        return $this->user_id === $userId && ! $this->isSystem() && ! $this->isRetracted()
            && $this->body !== null && $this->created_at->gt(now()->subMinutes(self::EDIT_WINDOW_MINUTES));
    }

    /** L'auteur peut encore le supprimer pour tout le monde. */
    public function retractableBy(int $userId): bool
    {
        return $this->user_id === $userId && ! $this->isSystem() && ! $this->isRetracted()
            && $this->created_at->gt(now()->subMinutes(self::RETRACT_WINDOW_MINUTES));
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationMessage extends Model
{
    public const KIND_USER = 'user';

    /** Message automatique d'EEHT Connect (rappel, alerte), sans auteur. */
    public const KIND_SYSTEM = 'system';

    protected $fillable = [
        'conversation_id', 'user_id', 'reply_to_id', 'kind', 'subject', 'body',
        'attachment_path', 'attachment_name', 'attachment_size', 'attachment_mime',
        'meta', 'pinned_at', 'pinned_by', 'pushed_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'pinned_at' => 'datetime',
        'pushed_at' => 'datetime',
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
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageReaction extends Model
{
    public const ALLOWED = ['👍', '❤️', '😂', '😮', '🙏', '✅', '🎉', '👏'];

    protected $fillable = ['conversation_message_id', 'user_id', 'emoji'];

    public function message()
    {
        return $this->belongsTo(ConversationMessage::class, 'conversation_message_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationMessage extends Model
{
    protected $fillable = [
        'conversation_id', 'user_id', 'subject', 'body',
        'attachment_path', 'attachment_name', 'attachment_size', 'attachment_mime', 'pushed_at',
    ];

    protected $casts = [
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
}

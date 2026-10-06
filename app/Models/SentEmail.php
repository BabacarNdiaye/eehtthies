<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SentEmail extends Model
{
    protected $fillable = [
        'sender_id', 'subject', 'body', 'recipients', 'recipients_count', 'failed_count',
    ];

    protected $casts = [
        'recipients' => 'array',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

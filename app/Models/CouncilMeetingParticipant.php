<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Participant d'une visioconférence : présent tant qu'il donne signe de vie (interrogation régulière). */
class CouncilMeetingParticipant extends Model
{
    protected $fillable = ['council_meeting_id', 'user_id', 'council_member_id', 'joined_at', 'last_seen_at', 'left_at', 'mic', 'cam'];

    protected $casts = [
        'joined_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'left_at' => 'datetime',
        'mic' => 'boolean',
        'cam' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

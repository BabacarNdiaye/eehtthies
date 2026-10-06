<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Visioconférence d'un conseil en séance : une seule ouverte à la fois par conseil. */
class CouncilMeeting extends Model
{
    public const TYPES = ['audio' => 'Audio', 'video' => 'Vidéo'];

    protected $fillable = ['council_id', 'type', 'started_by', 'started_at', 'ended_by', 'ended_at'];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function participants()
    {
        return $this->hasMany(CouncilMeetingParticipant::class);
    }

    public function signals()
    {
        return $this->hasMany(CouncilMeetingSignal::class);
    }

    public function isOpen(): bool
    {
        return $this->ended_at === null;
    }
}

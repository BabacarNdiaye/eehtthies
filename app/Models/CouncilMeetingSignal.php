<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Message de mise en relation WebRTC (offre, réponse, candidat ICE) d'un participant à un autre. */
class CouncilMeetingSignal extends Model
{
    public const UPDATED_AT = null;

    public const TYPES = ['offer', 'answer', 'candidate', 'bye'];

    protected $fillable = ['council_meeting_id', 'from_user_id', 'to_user_id', 'type', 'payload'];
}

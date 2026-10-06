<?php

namespace App\Models;

use App\Support\CouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Bulletin d'un membre (VOT-02). Il prouve que le membre a voté ; le choix n'est conservé qu'en vote nominatif.
 */
class CouncilVoteBallot extends Model
{
    protected $fillable = ['council_vote_id', 'council_member_id', 'choice'];

    protected static function booted(): void
    {
        $guard = function (self $ballot): void {
            $councilId = CouncilVote::whereKey($ballot->council_vote_id)->value('council_id');
            CouncilLock::assertWritable(Council::whereKey($councilId)->value('status'));
        };

        static::saving($guard);
        static::deleting($guard);
    }

    public function vote()
    {
        return $this->belongsTo(CouncilVote::class, 'council_vote_id');
    }

    public function member()
    {
        return $this->belongsTo(CouncilMember::class, 'council_member_id');
    }
}

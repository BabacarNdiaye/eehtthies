<?php

namespace App\Models;

use App\Exceptions\CouncilException;
use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Vote du conseil sur une décision proposée pour un élève (VOT-01). Ouvert, il reçoit des bulletins (vote sur appareil)
 * ou attend le décompte du président (main levée) ; clos, il ne change plus jamais (RG-16) : seul un nouveau vote peut
 * suivre.
 */
class CouncilVote extends Model
{
    use GuardedByCouncilLock;

    public const MODES = [
        'device' => 'Sur appareil',
        'show_of_hands' => 'À main levée',
    ];

    public const SECRECIES = [
        'nominal' => 'Nominatif',
        'secret' => 'Secret',
    ];

    public const MAJORITIES = [
        'expressed' => 'Majorité simple des suffrages exprimés',
        'absolute_present' => 'Majorité absolue des votants présents',
    ];

    public const CHOICES = [
        'for' => 'Pour',
        'against' => 'Contre',
        'abstain' => 'Abstention',
    ];

    public const RESULTS = [
        'adopted' => 'Adoptée',
        'rejected' => 'Rejetée',
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'casting_vote' => 'boolean',
        'tie_broken' => 'boolean',
        'voters_convoked' => 'integer',
        'voters_present' => 'integer',
        'quorum_required' => 'integer',
        'votes_for' => 'integer',
        'votes_against' => 'integer',
        'abstentions' => 'integer',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        $sealed = function (self $vote): void {
            if ($vote->getOriginal('closed_at') !== null) {
                throw CouncilException::rule('VOTE_CLOSED', 'Ce vote est clos : il ne peut pas être rouvert ni modifié. Lancez un nouveau vote si nécessaire.');
            }
        };

        static::updating($sealed);
        static::deleting($sealed);
    }

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function councilStudent()
    {
        return $this->belongsTo(CouncilStudent::class);
    }

    public function type()
    {
        return $this->belongsTo(DecisionType::class, 'decision_type_id');
    }

    public function ballots()
    {
        return $this->hasMany(CouncilVoteBallot::class);
    }

    public function opener()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function isOpen(): bool
    {
        return $this->closed_at === null;
    }
}

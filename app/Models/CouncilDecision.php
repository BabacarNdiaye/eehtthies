<?php

namespace App\Models;

use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/** Une décision du conseil pour un élève (type du référentiel + motif). Verrouillée à la clôture (RG-18). */
class CouncilDecision extends Model
{
    use GuardedByCouncilLock;

    public const ACTIVE = 'active';

    public const PROVISIONAL = 'provisional';

    public const RECTIFIED = 'rectified';

    protected $fillable = ['council_id', 'council_student_id', 'decision_type_id', 'reason', 'decided_by', 'status', 'superseded_by'];

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

    public function decider()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Recours d'une famille contre une décision d'orientation (REC-02). Tant qu'il est en cours, la décision est provisoire
 * (REC-03). Il se dépose dans le délai réglé par l'école après la notification (RG-20).
 */
class CouncilAppeal extends Model
{
    public const OUTCOMES = [
        'pending' => 'En cours',
        'upheld' => 'Décision maintenue',
        'modified' => 'Décision modifiée',
    ];

    protected $fillable = [
        'council_id', 'council_decision_id', 'filed_at', 'filed_by_name', 'reason', 'deadline', 'outcome', 'outcome_at',
        'outcome_decision_id', 'outcome_comment', 'recorded_by',
    ];

    protected $casts = [
        'filed_at' => 'date',
        'deadline' => 'date',
        'outcome_at' => 'datetime',
    ];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function decision()
    {
        return $this->belongsTo(CouncilDecision::class, 'council_decision_id');
    }
}

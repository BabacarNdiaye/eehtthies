<?php

namespace App\Models;

use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/** Note d'un critère de la grille de stage pour un élève du conseil (PRE-06). */
class CouncilInternshipEvaluation extends Model
{
    use GuardedByCouncilLock;

    /** Échelle de la grille, du meilleur au moins bon. */
    public const RATINGS = [
        'tres_satisfaisant' => 'Très satisfaisant',
        'satisfaisant' => 'Satisfaisant',
        'a_ameliorer' => 'À améliorer',
        'insuffisant' => 'Insuffisant',
    ];

    protected $fillable = ['council_id', 'council_student_id', 'criterion_id', 'company_name', 'tutor_name', 'rating', 'comment', 'recorded_by'];

    public function councilStudent()
    {
        return $this->belongsTo(CouncilStudent::class);
    }

    public function criterion()
    {
        return $this->belongsTo(InternshipCriterion::class, 'criterion_id');
    }
}

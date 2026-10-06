<?php

namespace App\Models;

use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Un élève dans un conseil : la photo de ses données (figée à l'ouverture de la séance), sa pastille, la synthèse du
 * professeur principal, l'appréciation générale du conseil et son statut d'examen en séance.
 */
class CouncilStudent extends Model
{
    use GuardedByCouncilLock;

    public const REVIEW_STATUSES = [
        'pending' => 'À examiner',
        'on_hold' => 'En attente',
        'reviewed' => 'Examiné',
    ];

    public const ALERT_LEVELS = [
        'green' => 'Situation favorable',
        'orange' => 'Vigilance',
        'red' => 'Attention particulière',
    ];

    protected $fillable = [
        'council_id', 'student_id', 'snapshot', 'general_average', 'rank', 'class_size', 'previous_average', 'progression',
        'failed_subjects_count', 'unjustified_absence_hours', 'alert_level', 'alert_reasons', 'review_status',
        'main_teacher_summary', 'main_teacher_recommendation_id', 'general_appreciation', 'has_left_class', 'revision',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'alert_reasons' => 'array',
        'general_average' => 'float',
        'previous_average' => 'float',
        'progression' => 'float',
        'unjustified_absence_hours' => 'float',
        'rank' => 'integer',
        'class_size' => 'integer',
        'failed_subjects_count' => 'integer',
        'has_left_class' => 'boolean',
        'revision' => 'integer',
    ];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function decisions()
    {
        return $this->hasMany(CouncilDecision::class);
    }

    public function recommendation()
    {
        return $this->belongsTo(DecisionType::class, 'main_teacher_recommendation_id');
    }
}

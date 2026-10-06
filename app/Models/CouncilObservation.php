<?php

namespace App\Models;

use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Saisie d'un enseignant pour un élève et sa matière (PRE-01) : appréciation publiable, observation interne, difficulté
 * constatée, recommandation. L'observation interne ne sort jamais vers la projection ni les familles.
 */
class CouncilObservation extends Model
{
    use GuardedByCouncilLock;

    public const DIFFICULTIES = [
        'comprehension' => 'Compréhension',
        'methode' => 'Méthode de travail',
        'travail_personnel' => 'Travail personnel',
        'assiduite' => 'Assiduité',
        'comportement' => 'Comportement',
        'expression' => 'Expression',
        'pratique' => 'Gestes professionnels',
    ];

    protected $fillable = [
        'council_id', 'council_student_id', 'subject_id', 'teacher_id', 'user_id', 'appreciation', 'internal_note',
        'difficulty', 'recommendation', 'revision',
    ];

    protected $casts = ['revision' => 'integer'];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function councilStudent()
    {
        return $this->belongsTo(CouncilStudent::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    /** Renseignée = au moins l'appréciation publiable. */
    public function isFilled(): bool
    {
        return filled($this->appreciation);
    }
}

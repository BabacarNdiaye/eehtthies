<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentProgression extends Model
{
    public const DECISIONS = [
        'en_cours' => 'En cours',
        'passage' => 'Passage en classe supérieure',
        'redoublement' => 'Redoublement',
        'diplome' => 'Diplômé(e)',
        'non_admis' => 'Non admis(e)',
        'certifie' => 'Certifié(e)',
        'abandon' => 'Abandon',
        'exclu' => 'Exclusion',
    ];

    protected $fillable = [
        'student_id', 'formation_level_id', 'academic_year_id',
        'decision', 'reason', 'decided_by', 'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function formationLevel()
    {
        return $this->belongsTo(FormationLevel::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function decidedBy()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}

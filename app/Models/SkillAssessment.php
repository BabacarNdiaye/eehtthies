<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SkillAssessment extends Model
{
    protected $fillable = ['student_id', 'skill_id', 'teacher_id', 'level', 'assessed_at', 'comment'];

    protected $casts = [
        'assessed_at' => 'date',
        'level' => 'integer',
    ];

    public const LEVELS = [
        1 => 'Non acquis',
        2 => "En cours d'acquisition",
        3 => 'Acquis',
        4 => 'Maîtrisé',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function skill()
    {
        return $this->belongsTo(Skill::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }
}

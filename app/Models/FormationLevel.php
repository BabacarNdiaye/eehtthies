<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationLevel extends Model
{
    protected $fillable = [
        'formation_id', 'level_number', 'label', 'is_final_level',
        'min_average', 'max_unjustified_absences', 'internship_required', 'final_exam_required',
    ];

    protected $casts = [
        'is_final_level' => 'boolean',
        'min_average' => 'decimal:2',
        'internship_required' => 'boolean',
        'final_exam_required' => 'boolean',
    ];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function requiredSubjects()
    {
        return $this->belongsToMany(Subject::class, 'formation_level_required_subject');
    }

    public function requiredSkills()
    {
        return $this->belongsToMany(Skill::class, 'formation_level_required_skill');
    }

    public function schoolClasses()
    {
        return $this->hasMany(SchoolClass::class);
    }

    /** Le niveau dont level_number est supérieur d'une unité, dans la même formation — la cible de promotion automatique. */
    public function nextLevel()
    {
        return $this->formation->levels()->where('level_number', $this->level_number + 1)->first();
    }
}

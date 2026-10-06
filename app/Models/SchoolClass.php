<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    protected $fillable = ['name', 'formation_id', 'academic_year_id', 'capacity', 'next_class_id', 'formation_level_id'];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function formationLevel()
    {
        return $this->belongsTo(FormationLevel::class);
    }

    public function nextClass()
    {
        return $this->belongsTo(SchoolClass::class, 'next_class_id');
    }

    /**
     * Détermine la classe dans laquelle cet élève doit passer ensuite : on privilégie la recherche par niveau
     * de formation (qui survit d'une année à l'autre sans reconfiguration manuelle) et on se rabat sur
     * `next_class_id` configuré manuellement.
     */
    public function nextClassAuto(): ?self
    {
        if ($this->formationLevel) {
            $nextLevel = $this->formationLevel->nextLevel();

            if ($nextLevel) {
                $target = static::where('formation_id', $this->formation_id)
                    ->where('formation_level_id', $nextLevel->id)
                    ->whereHas('academicYear', fn ($q) => $q->where('start_date', '>', $this->academicYear->start_date))
                    ->orderBy('academic_year_id')
                    ->first();

                if ($target) {
                    return $target;
                }
            }
        }

        return $this->nextClass;
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function teachers()
    {
        return $this->belongsToMany(Teacher::class, 'school_class_teacher');
    }

    /** Groupe EEHT Connect de la classe. */
    public function conversation()
    {
        return $this->hasOne(Conversation::class);
    }

    public function lessonLogs()
    {
        return $this->hasMany(LessonLog::class);
    }
}

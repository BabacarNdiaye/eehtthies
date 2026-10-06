<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = ['name', 'code', 'formation_id', 'coefficient', 'subject_group_id'];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    /** Groupe du conseil de classe (général, professionnel, travaux pratiques, stage) ; nul tant que la matière n'est pas classée. */
    public function subjectGroup()
    {
        return $this->belongsTo(SubjectGroup::class);
    }

    public function teachers()
    {
        return $this->belongsToMany(Teacher::class, 'subject_teacher');
    }
}

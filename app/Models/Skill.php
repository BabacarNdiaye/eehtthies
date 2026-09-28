<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Skill extends Model
{
    protected $fillable = ['formation_id', 'name', 'description', 'order'];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function assessments()
    {
        return $this->hasMany(SkillAssessment::class);
    }
}

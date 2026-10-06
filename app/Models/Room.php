<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['name', 'type', 'capacity'];

    public function timetableEntries()
    {
        return $this->hasMany(TimetableEntry::class);
    }

    public function exams()
    {
        return $this->hasMany(Exam::class);
    }
}

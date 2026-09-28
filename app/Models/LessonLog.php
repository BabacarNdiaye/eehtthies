<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LessonLog extends Model
{
    protected $fillable = [
        'timetable_entry_id', 'teacher_id', 'school_class_id', 'subject_id',
        'date', 'content', 'homework',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function timetableEntry()
    {
        return $this->belongsTo(TimetableEntry::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}

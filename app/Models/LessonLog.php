<?php

namespace App\Models;

use App\Services\ConnectReminders;
use Illuminate\Database\Eloquent\Model;

class LessonLog extends Model
{
    protected $fillable = [
        'timetable_entry_id', 'teacher_id', 'school_class_id', 'subject_id',
        'date', 'content', 'homework',
    ];

    protected static function booted(): void
    {
        // Un devoir noté au cahier de texte est annoncé dans le groupe de la classe.
        static::saved(function (LessonLog $log) {
            if ($log->homework && ($log->wasRecentlyCreated || $log->wasChanged('homework'))) {
                ConnectReminders::safely(fn (ConnectReminders $reminders) => $reminders->announceHomework($log));
            }
        });
    }

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

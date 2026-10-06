<?php

namespace App\Models;

use App\Services\ConnectReminders;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'student_id', 'school_class_id', 'subject_id', 'timetable_entry_id', 'date',
        'status', 'checked_in_at', 'justification', 'recorded_by',
    ];

    protected $casts = [
        'date' => 'date',
        'checked_in_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        // Absence ou retard : message dans la conversation « Assistant EEHT
        // Connect » de l'élève et de son parent (avec notification push).
        static::created(fn (Attendance $attendance) => ConnectReminders::safely(
            fn (ConnectReminders $reminders) => $reminders->announceAttendance($attendance)
        ));
    }

    public const STATUSES = [
        'present' => 'Présent',
        'absent' => 'Absent',
        'retard' => 'Retard',
        'absence_justifiee' => 'Absence justifiée',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function timetableEntry()
    {
        return $this->belongsTo(TimetableEntry::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

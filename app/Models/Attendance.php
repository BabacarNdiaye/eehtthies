<?php

namespace App\Models;

use App\Notifications\PushAlert;
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
        static::created(function (Attendance $attendance) {
            if ($attendance->status === 'absent') {
                $attendance->student?->user?->notify(new PushAlert(
                    'Absence enregistrée',
                    'Une absence a été enregistrée le '.$attendance->date->format('d/m/Y').'.',
                    '/espace-eleve/presences'
                ));
            }

            if ($attendance->status === 'retard') {
                $attendance->student?->user?->notify(new PushAlert(
                    'Retard enregistré',
                    'Un retard a été enregistré le '.$attendance->date->format('d/m/Y').'.',
                    '/espace-eleve/presences'
                ));
            }
        });
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

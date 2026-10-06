<?php

namespace App\Models;

use App\Services\ConnectReminders;
use Illuminate\Database\Eloquent\Model;

class TimetableEntry extends Model
{
    protected $fillable = [
        'school_class_id', 'subject_id', 'teacher_id', 'room_id',
        'day_of_week', 'start_time', 'end_time',
    ];

    protected static function booted(): void
    {
        // Changements publiés dans le groupe EEHT Connect de la classe
        // (regroupés par app:connect-reminders).
        foreach (['created', 'updated', 'deleted'] as $event) {
            static::$event(fn (TimetableEntry $entry) => ConnectReminders::safely(
                fn (ConnectReminders $reminders) => $reminders->recordTimetableChange($entry, $event)
            ));
        }
    }

    public const DAYS = [
        1 => 'Lundi',
        2 => 'Mardi',
        3 => 'Mercredi',
        4 => 'Jeudi',
        5 => 'Vendredi',
        6 => 'Samedi',
        7 => 'Dimanche',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}

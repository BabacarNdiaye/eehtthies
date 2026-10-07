<?php

namespace App\Models;

use App\Services\ConnectReminders;
use App\Support\RichText;
use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /** Contenu de la séance et devoirs : texte riche (éditeur), nettoyé à l'écriture et à la lecture. */
    protected function content(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value === null ? null : RichText::clean($value),
            set: fn (?string $value) => RichText::forStorage($value),
        );
    }

    protected function homework(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value === null ? null : (RichText::clean($value) ?: null),
            set: fn (?string $value) => RichText::forStorage($value),
        );
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

<?php

namespace App\Models;

use App\Services\ConnectReminders;
use App\Support\RichText;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/** Travail à faire à la maison, donné par un enseignant à une classe dans une matière. */
class HomeAssignment extends Model
{
    protected $fillable = ['teacher_id', 'school_class_id', 'subject_id', 'title', 'instructions', 'given_on', 'due_date'];

    protected $casts = ['given_on' => 'date', 'due_date' => 'date'];

    protected static function booted(): void
    {
        static::created(function (HomeAssignment $assignment) {
            ConnectReminders::safely(fn (ConnectReminders $reminders) => $reminders->announceAssignment($assignment));
        });
    }

    protected function instructions(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value === null ? null : (RichText::clean($value) ?: null),
            set: fn (?string $value) => RichText::forStorage($value),
        );
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

<?php

namespace App\Models;

use App\Notifications\PushAlert;
use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $fillable = [
        'title', 'type', 'session', 'school_class_id', 'subject_id', 'room_id',
        'academic_year_id', 'term', 'exam_date', 'start_time', 'end_time',
        'max_score', 'coefficient', 'is_published', 'created_by',
    ];

    protected $casts = [
        'exam_date' => 'date',
        'is_published' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::updated(function (Exam $exam) {
            if ($exam->wasChanged('is_published') && $exam->is_published) {
                $userIds = Student::where('school_class_id', $exam->school_class_id)
                    ->whereNotNull('user_id')
                    ->pluck('user_id');

                User::whereIn('id', $userIds)->get()->each(
                    fn (User $user) => $user->notify(new PushAlert(
                        'Notes publiées',
                        $exam->title,
                        '/espace-eleve/notes'
                    ))
                );
            }
        });
    }

    public const TYPES = [
        'devoir' => 'Devoir',
        'interrogation' => 'Interrogation',
        'controle' => 'Contrôle',
        'examen' => 'Composition',
        'examen_pratique' => 'Composition pratique',
        'examen_theorique' => 'Composition théorique',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function invigilators()
    {
        return $this->belongsToMany(Teacher::class, 'exam_teacher');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

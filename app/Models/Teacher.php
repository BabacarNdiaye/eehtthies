<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Teacher extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('enseignants');
    }

    protected $fillable = [
        'user_id', 'matricule', 'first_name', 'last_name', 'photo', 'phone',
        'email', 'professional_email', 'address', 'specialty', 'diplomas', 'experience_years', 'status',
        'payment_type', 'monthly_salary', 'hourly_rate',
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
    ];

    public const PAYMENT_TYPES = [
        'fixe' => 'Salaire fixe',
        'horaire' => 'Taux horaire',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'subject_teacher');
    }

    public function schoolClasses()
    {
        return $this->belongsToMany(SchoolClass::class, 'school_class_teacher');
    }

    public function salaryPayments()
    {
        return $this->hasMany(TeacherSalaryPayment::class);
    }

    public function lessonLogs()
    {
        return $this->hasMany(LessonLog::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}

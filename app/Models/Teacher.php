<?php

namespace App\Models;

use App\Models\Concerns\HasAttachments;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Teacher extends Model
{
    use HasAttachments, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            // Le compte de versement est une donnée sensible : jamais au journal d'activité.
            ->logExcept(['payout_channel', 'payout_account'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('enseignants');
    }

    protected $fillable = [
        'user_id', 'matricule', 'first_name', 'last_name', 'photo', 'phone',
        'email', 'professional_email', 'address', 'specialty', 'diplomas', 'experience_years', 'status',
        'payment_type', 'monthly_salary', 'hourly_rate', 'payout_channel', 'payout_account',
    ];

    /** Jamais sérialisés avec la fiche : le contrôleur les ajoute à part, avec les permissions des salaires. */
    protected $hidden = ['payout_channel', 'payout_account'];

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

    /** @return list<int> Identifiants des matières affectées à l'enseignant (vide : aucune affectation). */
    public function assignedSubjectIds(): array
    {
        return $this->subjects()->pluck('subjects.id')->map(fn ($id) => (int) $id)->all();
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

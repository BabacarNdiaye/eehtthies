<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Student extends Model
{
    use LogsActivity;

    private const DURATION_PHRASES = [
        '6 mois' => 'de six (6) mois',
        '1 an' => "d'un (1) an",
        '2 ans' => 'de deux (2) ans',
        '3 ans' => 'de trois (3) ans',
    ];

    /** « 1 an » -> « d'un (1) an », pour la formulation officielle du diplôme (« une formation d'une durée {phrase} »). */
    public function getFormattedTrainingDurationAttribute(): ?string
    {
        if (! $this->training_duration) {
            return null;
        }

        return self::DURATION_PHRASES[$this->training_duration] ?? ('de '.$this->training_duration);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('eleves');
    }

    protected $fillable = [
        'user_id', 'parent_user_id', 'matricule', 'photo', 'first_name', 'last_name', 'birth_date',
        'birth_place', 'gender', 'address', 'phone', 'email', 'professional_email', 'formation_id', 'school_class_id',
        'academic_year_id', 'guardian_name', 'guardian_phone', 'guardian_email', 'emergency_contact',
        'blood_group', 'allergies', 'chronic_conditions', 'current_medication', 'health_insurance',
        'doctor_name', 'doctor_phone', 'health_notes',
        'status', 'is_repeating', 'candidature_id', 'graduation_year', 'training_duration', 'current_position', 'current_employer',
        'linkedin_url', 'alumni_bio', 'is_alumni_public', 'diploma_number', 'diploma_issued_at', 'qr_token',
        'training_attestation_number', 'training_attestation_issued_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'diploma_issued_at' => 'date',
        'training_attestation_issued_at' => 'date',
        'is_alumni_public' => 'boolean',
        'is_repeating' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Student $student) {
            if (empty($student->qr_token)) {
                $student->qr_token = Str::random(24);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parentUser()
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function candidature()
    {
        return $this->belongsTo(Candidature::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function skillAssessments()
    {
        return $this->hasMany(SkillAssessment::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function reportCards()
    {
        return $this->hasMany(ReportCard::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function internships()
    {
        return $this->hasMany(Internship::class);
    }

    public function documents()
    {
        return $this->hasMany(StudentDocument::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function generateDiplomaNumber(): string
    {
        if (empty($this->diploma_number)) {
            $this->diploma_number = 'DIP-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            $this->diploma_issued_at = now();
            $this->save();
        }

        return $this->diploma_number;
    }

    public function generateTrainingAttestationNumber(): string
    {
        if (empty($this->training_attestation_number)) {
            $this->training_attestation_number = 'ATF-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            $this->training_attestation_issued_at = now();
            $this->save();
        }

        return $this->training_attestation_number;
    }

    /** Renseigne le jeton du badge QR pour les élèves créés avant l'existence de la colonne qr_token. */
    public function generateQrToken(): string
    {
        if (empty($this->qr_token)) {
            $this->qr_token = Str::random(24);
            $this->save();
        }

        return $this->qr_token;
    }
}

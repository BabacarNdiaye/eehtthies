<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Candidature extends Model implements HasMedia
{
    use InteractsWithMedia, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'admin_notes', 'interview_at'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('candidatures');
    }

    protected $fillable = [
        'reference', 'formation_id', 'academic_year_id', 'first_name', 'last_name',
        'birth_date', 'gender', 'email', 'phone', 'address', 'guardian_name',
        'guardian_phone', 'last_school', 'last_diploma', 'motivation', 'status',
        'admin_notes', 'source', 'interview_at', 'submitted_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'interview_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public const STATUSES = [
        'brouillon' => 'Brouillon',
        'soumise' => 'Soumise',
        'en_cours_etude' => "En cours d'étude",
        'dossier_incomplet' => 'Dossier incomplet',
        'preselectionnee' => 'Présélectionnée',
        'acceptee' => 'Acceptée',
        'refusee' => 'Refusée',
        'inscription_finalisee' => 'Inscription finalisée',
    ];

    protected static function booted(): void
    {
        static::creating(function (Candidature $candidature) {
            if (empty($candidature->reference)) {
                $candidature->reference = 'CAND-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            }
        });
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('documents');
    }
}

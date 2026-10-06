<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Formation extends Model
{
    public const DIPLOMA_LABELS = [
        'CAP' => "Certificat d'Aptitude Professionnelle",
        'BEP' => "Brevet d'Études Professionnelles",
        'BT' => 'Brevet de Technicien',
        'BTS' => 'Brevet de Technicien Supérieur',
        'DTS' => 'Diplôme de Technicien Supérieur',
        'CQP' => 'Certificat de Qualification Professionnelle',
        'CS' => 'Certificat de Spécialité',
    ];

    public const DIPLOMA_RECOGNITIONS = ["Diplôme d'État", "Diplôme d'école", 'Attestation'];

    protected $fillable = [
        'name', 'code', 'slug', 'diploma', 'diploma_recognition', 'specialty_override', 'level', 'duration', 'description',
        'admission_conditions', 'registration_fee', 'tuition_fee', 'program',
        'objectives', 'career_prospects', 'capacity', 'next_intake_date', 'image', 'is_active', 'order',
        'duration_value', 'duration_unit',
    ];

    public const DURATION_UNITS = [
        'annee' => 'Année(s)',
        'semestre' => 'Semestre(s)',
        'mois' => 'Mois',
        'semaine' => 'Semaine(s)',
        'jour' => 'Jour(s)',
        'heure' => 'Heure(s)',
        'module' => 'Module(s)',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'registration_fee' => 'decimal:2',
        'tuition_fee' => 'decimal:2',
        'next_intake_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (Formation $formation) {
            if (empty($formation->slug)) {
                $formation->slug = Str::slug($formation->name);
            }
        });
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function schoolClasses()
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function skills()
    {
        return $this->hasMany(Skill::class);
    }

    public function candidatures()
    {
        return $this->hasMany(Candidature::class);
    }

    public function testimonials()
    {
        return $this->hasMany(Testimonial::class);
    }

    public function levels()
    {
        return $this->hasMany(FormationLevel::class)->orderBy('level_number');
    }

    /**
     * « CAP Restauration » + diplôme « CAP » -> « Restauration », pour la formulation du diplôme (« en
     * Restauration »). Se rabat sur `specialty_override` lorsque le nom ne porte pas la spécialité sous la
     * forme d'un suffixe « {diploma} {specialty} » (p. ex. une formation nommée simplement « Certificat de
     * Qualification Professionnelle »).
     */
    public function getSpecialtyAttribute(): string
    {
        if ($this->diploma && str_starts_with($this->name, $this->diploma.' ')) {
            return substr($this->name, strlen($this->diploma) + 1);
        }

        return $this->specialty_override ?: $this->name;
    }

    /** « Certificat d'Aptitude Professionnelle » pour le diplôme « CAP », avec repli sur le code brut. */
    public function getDiplomaFullNameAttribute(): ?string
    {
        return $this->diploma ? (self::DIPLOMA_LABELS[$this->diploma] ?? $this->diploma) : null;
    }

    /**
     * « certificat » / « brevet » / « diplôme » — le nom générique sous lequel cette qualification est
     * désignée, tiré du premier mot de son libellé complet, afin que la phrase de clôture du diplôme (« le
     * présent {word} lui est délivré... ») reste grammaticalement correcte pour chaque type de diplôme.
     */
    public function getDocumentTypeWordAttribute(): string
    {
        $label = $this->diploma_full_name ?? $this->name;

        return Str::lower(Str::before($label, ' '));
    }
}

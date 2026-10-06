<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Une sanction du registre de la vie scolaire. Le conseil de classe la lit (SnapshotService) ; il n'en crée jamais.
 */
class DisciplineRecord extends Model
{
    use LogsActivity;

    /**
     * Niveaux, du plus léger au plus lourd (clé enregistrée => libellé). L'ordre sert de poids : rank().
     * Le niveau est une chaîne et non un enum MySQL, pour qu'en ajouter un n'exige pas de migration.
     */
    public const LEVELS = [
        'avertissement' => 'Avertissement',
        'blame' => 'Blâme',
        'exclusion_cours' => 'Exclusion de cours',
        'exclusion' => 'Exclusion temporaire',
    ];

    protected $fillable = ['student_id', 'school_class_id', 'occurred_on', 'level', 'reason', 'days', 'recorded_by'];

    protected $casts = [
        'occurred_on' => 'date',
        'days' => 'integer',
    ];

    /** Poids d'un niveau (1 = le plus léger) ; 0 pour un niveau inconnu, qui ne pèse donc rien. */
    public static function rank(string $level): int
    {
        $position = array_search($level, array_keys(self::LEVELS), true);

        return $position === false ? 0 : $position + 1;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('discipline');
    }

    public function getLevelLabelAttribute(): string
    {
        return self::LEVELS[$this->level] ?? $this->level;
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

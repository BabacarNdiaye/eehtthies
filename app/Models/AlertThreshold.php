<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Seuils d'une pastille d'alerte (RG-06) : un niveau (orange ou rouge) pour toute l'école (formation_id nul) ou propre à
 * une formation. Un champ laissé vide n'entre pas dans le calcul de ce niveau.
 */
class AlertThreshold extends Model
{
    use LogsActivity;

    public const ORANGE = 'orange';

    public const RED = 'red';

    public const LEVELS = [
        self::ORANGE => 'Vigilance',
        self::RED => 'Attention particulière',
    ];

    protected $fillable = [
        'formation_id', 'level', 'max_average', 'unjustified_absence_hours', 'failed_subjects_count', 'progression_drop', 'sanction_level',
    ];

    protected $casts = [
        'max_average' => 'float',
        'unjustified_absence_hours' => 'float',
        'failed_subjects_count' => 'integer',
        'progression_drop' => 'float',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('conseils');
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    /**
     * Les seuils qui s'appliquent à une formation : pour chaque niveau, la ligne propre à la formation si elle existe, sinon
     * celle de l'école. Un niveau absent des deux (jeu par défaut supprimé) reste absent : il ne déclenche rien.
     *
     * @return array<string, AlertThreshold>
     */
    public static function resolve(?int $formationId): array
    {
        $rows = static::whereNull('formation_id')
            ->when($formationId, fn ($query) => $query->orWhere('formation_id', $formationId))
            ->get();

        $resolved = [];

        foreach (array_keys(self::LEVELS) as $level) {
            $own = $formationId ? $rows->first(fn (AlertThreshold $row) => $row->formation_id === $formationId && $row->level === $level) : null;
            $default = $rows->first(fn (AlertThreshold $row) => $row->formation_id === null && $row->level === $level);

            if ($own ?? $default) {
                $resolved[$level] = $own ?? $default;
            }
        }

        return $resolved;
    }

    /**
     * Enregistre les seuils d'un niveau pour l'école (formation nulle) ou une formation. L'unicité du jeu par défaut est
     * tenue ici : MySQL accepte plusieurs NULL dans un index unique.
     *
     * @param  array<string, mixed>  $values
     */
    public static function saveFor(?int $formationId, string $level, array $values): self
    {
        return static::updateOrCreate(['formation_id' => $formationId, 'level' => $level], $values);
    }
}

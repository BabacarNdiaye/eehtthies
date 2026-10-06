<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Un type de décision du conseil de classe (référentiel PAR-01 à PAR-03). La catégorie fixe les règles de cumul :
 * une seule distinction par élève (RG-08), aucune distinction avec une alerte (RG-09), une seule orientation et
 * seulement en fin d'année (RG-10, DEC-01).
 */
class DecisionType extends Model
{
    use LogsActivity;

    public const DISTINCTION = 'distinction';

    public const ALERT = 'alert';

    public const SUPPORT = 'support';

    public const ORIENTATION = 'orientation';

    public const CATEGORIES = [
        self::DISTINCTION => 'Distinction',
        self::ALERT => 'Alerte',
        self::SUPPORT => 'Accompagnement',
        self::ORIENTATION => 'Orientation',
    ];

    /** Teintes proposées (nom => libellé) ; l'interface les traduit en classes de couleur, contrastes vérifiés. */
    public const TONES = [
        'emerald' => 'Vert',
        'sky' => 'Bleu',
        'violet' => 'Violet',
        'amber' => 'Ambre',
        'orange' => 'Orange',
        'red' => 'Rouge',
        'ink' => 'Gris',
    ];

    protected $fillable = [
        'code', 'label', 'category', 'color', 'sort_order', 'is_active', 'is_published_on_report', 'is_end_of_year_only',
        'requires_vote', 'creates_follow_up', 'requires_reason', 'report_mention', 'report_decision',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'is_published_on_report' => 'boolean',
        'is_end_of_year_only' => 'boolean',
        'requires_vote' => 'boolean',
        'creates_follow_up' => 'boolean',
        'requires_reason' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('conseils');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('label');
    }

    /** Une paire se range toujours dans l'ordre croissant : [a, b] et [b, a] sont la même règle. */
    public static function pairKey(int $first, int $second): array
    {
        return $first < $second ? [$first, $second] : [$second, $first];
    }

    /** @return list<int> les types incompatibles avec celui-ci, quel que soit le sens dans lequel la paire est rangée */
    public function incompatibleIds(): array
    {
        return DB::table('decision_type_incompatibilities')
            ->where('decision_type_id', $this->id)->pluck('incompatible_type_id')
            ->merge(DB::table('decision_type_incompatibilities')->where('incompatible_type_id', $this->id)->pluck('decision_type_id'))
            ->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    /**
     * Remplace les incompatibilités de ce type. Un type n'est jamais incompatible avec lui-même ; un identifiant inconnu
     * est ignoré.
     *
     * @param  list<int>  $ids
     */
    public function syncIncompatibilities(array $ids): void
    {
        $ids = static::whereIn('id', array_diff(array_map('intval', $ids), [$this->id]))->pluck('id')->all();

        DB::transaction(function () use ($ids) {
            DB::table('decision_type_incompatibilities')
                ->where(fn ($query) => $query->where('decision_type_id', $this->id)->orWhere('incompatible_type_id', $this->id))
                ->delete();

            foreach ($ids as $other) {
                [$low, $high] = self::pairKey($this->id, (int) $other);
                DB::table('decision_type_incompatibilities')->insert([
                    'decision_type_id' => $low, 'incompatible_type_id' => $high, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        });
    }

    /** Déjà choisi dans une décision de conseil : on le désactive alors au lieu de le supprimer. */
    public function isUsed(): bool
    {
        return Schema::hasTable('council_decisions')
            && DB::table('council_decisions')->where('decision_type_id', $this->id)->exists();
    }
}

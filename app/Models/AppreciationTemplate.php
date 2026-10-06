<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/** Phrase type de la banque d'appréciations (PAR-06), insérée puis modifiable (PRE-02, DEC-03). */
class AppreciationTemplate extends Model
{
    use LogsActivity;

    public const LEVELS = [
        'excellent' => 'Excellent',
        'bien' => 'Bien',
        'moyen' => 'Moyen',
        'insuffisant' => 'Insuffisant',
    ];

    public const THEMES = [
        'travail' => 'Travail',
        'comportement' => 'Comportement',
        'progression' => 'Progression',
    ];

    protected $fillable = ['level', 'theme', 'text', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->dontLogEmptyChanges()->useLogName('conseils');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** @return list<array{id: int, level: string, theme: string, text: string}> */
    public static function bank(): array
    {
        return static::active()->orderBy('level')->orderBy('theme')->orderBy('sort_order')->get(['id', 'level', 'theme', 'text'])->toArray();
    }
}

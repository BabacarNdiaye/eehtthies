<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Groupe de matières du conseil de classe (PAR-05) : enseignement général, professionnel, travaux pratiques, stage. La
 * moyenne d'un groupe est la moyenne pondérée par coefficient de ses matières (RG-03).
 */
class SubjectGroup extends Model
{
    use LogsActivity;

    /** Le groupe « Stage » est une appréciation qualitative : il n'entre jamais dans une moyenne (RG-03). */
    public const INTERNSHIP = 'stage';

    protected $fillable = ['code', 'label', 'sort_order'];

    protected $casts = ['sort_order' => 'integer'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('conseils');
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }
}

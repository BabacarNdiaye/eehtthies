<?php

namespace App\Models\Concerns;

use App\Models\Council;
use App\Support\CouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Pour les lignes rattachées à un conseil (membres, élèves, décisions…) : aucun enregistrement ni suppression quand le
 * conseil est clôturé (RG-18), quel que soit le chemin par lequel on y arrive. Le statut est relu en base : une relation
 * chargée plus tôt pourrait être périmée.
 */
trait GuardedByCouncilLock
{
    public static function bootGuardedByCouncilLock(): void
    {
        $guard = function (Model $model): void {
            CouncilLock::assertWritable(Council::whereKey($model->getAttribute('council_id'))->value('status'));
        };

        static::saving($guard);
        static::deleting($guard);
    }
}

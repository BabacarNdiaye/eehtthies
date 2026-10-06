<?php

namespace App\Services\Council;

use App\Models\Council;
use App\Models\CouncilStudent;

/**
 * Synthèse de classe (RG-04, SEA-03) tirée de la photo : effectif, effectif évalué (élèves ayant une moyenne), moyenne de
 * classe, minimum, maximum, taux ≥ 10 = élèves ≥ 10 ÷ effectif évalué, répartition des pastilles, heures d'absence.
 * Les élèves sortis de la classe (RG-21) n'y comptent pas.
 */
class ClassSummary
{
    /**
     * @return array{count: int, evaluated: int, average: float|null, min: float|null, max: float|null, pass_rate: float|null, alerts: array<string, int>, unjustified_hours: float, left: int}
     */
    public static function for(Council $council): array
    {
        $rows = $council->students()->get(['general_average', 'alert_level', 'unjustified_absence_hours', 'has_left_class']);
        $present = $rows->reject(fn (CouncilStudent $row) => $row->has_left_class);
        $averages = $present->pluck('general_average')->filter(fn ($value) => $value !== null);

        return [
            'count' => $present->count(),
            'evaluated' => $averages->count(),
            'average' => $averages->isEmpty() ? null : round($averages->avg(), 2),
            'min' => $averages->isEmpty() ? null : (float) $averages->min(),
            'max' => $averages->isEmpty() ? null : (float) $averages->max(),
            'pass_rate' => $averages->isEmpty() ? null : round($averages->filter(fn ($value) => $value >= 10)->count() / $averages->count() * 100, 1),
            'alerts' => [
                'red' => $present->where('alert_level', 'red')->count(),
                'orange' => $present->where('alert_level', 'orange')->count(),
                'green' => $present->where('alert_level', 'green')->count(),
            ],
            'unjustified_hours' => round((float) $present->sum('unjustified_absence_hours'), 1),
            'left' => $rows->count() - $present->count(),
        ];
    }
}

<?php

namespace App\Services\Council;

use App\Models\AlertThreshold;
use App\Models\CouncilStudent;
use App\Models\DisciplineRecord;

/**
 * Pastille d'alerte d'un élève (RG-06, RG-07) à partir des seuils de sa formation : la règle la plus grave l'emporte et
 * chaque motif est donné. La pastille est une aide : elle ne choisit aucune décision.
 *
 * Comparaisons (identiques pour les deux niveaux, sauf les heures) :
 *  - moyenne générale strictement inférieure au seuil ;
 *  - heures d'absence non justifiée : « à partir de » pour l'orange, « plus de » pour le rouge (10 à 20 h = orange,
 *    plus de 20 h = rouge, comme le cahier des charges) ;
 *  - matières sous 10 : ce nombre ou davantage ;
 *  - baisse de la moyenne : cette baisse ou davantage ;
 *  - sanction : une sanction de ce niveau ou plus lourde pendant la période.
 * Un seuil vide n'entre pas dans le calcul ; une donnée absente (moyenne inconnue, première période) non plus.
 */
class AlertService
{
    /**
     * @param  array{average: float|null, unjustified_hours: float, failed_subjects: int, progression: float|null, max_sanction: string|null}  $facts
     * @param  array<string, AlertThreshold>  $thresholds  par niveau (AlertThreshold::resolve)
     * @return array{level: string, reasons: list<string>}
     */
    public function evaluate(array $facts, array $thresholds): array
    {
        foreach ([AlertThreshold::RED, AlertThreshold::ORANGE] as $level) {
            $threshold = $thresholds[$level] ?? null;

            if (! $threshold) {
                continue;
            }

            $reasons = $this->reasons($facts, $threshold, $level === AlertThreshold::RED);

            if ($reasons !== []) {
                return ['level' => $level, 'reasons' => $reasons];
            }
        }

        return ['level' => 'green', 'reasons' => []];
    }

    /** @return list<string> */
    private function reasons(array $facts, AlertThreshold $threshold, bool $red): array
    {
        $reasons = [];
        $number = fn (float $value, int $decimals = 2) => rtrim(rtrim(number_format($value, $decimals, ',', ' '), '0'), ',');

        if ($threshold->max_average !== null && $facts['average'] !== null && $facts['average'] < $threshold->max_average) {
            $reasons[] = 'Moyenne générale de '.$number($facts['average']).' (sous '.$number($threshold->max_average).')';
        }

        if ($threshold->unjustified_absence_hours !== null) {
            $hours = $facts['unjustified_hours'];
            $limit = $threshold->unjustified_absence_hours;

            if ($red ? $hours > $limit : $hours >= $limit) {
                $reasons[] = $number($hours, 1).' h d’absence non justifiée ('.($red ? 'plus de ' : 'à partir de ').$number($limit, 1).' h)';
            }
        }

        if ($threshold->failed_subjects_count !== null && $threshold->failed_subjects_count > 0 && $facts['failed_subjects'] >= $threshold->failed_subjects_count) {
            $reasons[] = $facts['failed_subjects'].' matière(s) sous 10';
        }

        if ($threshold->progression_drop !== null && $facts['progression'] !== null && $facts['progression'] <= -$threshold->progression_drop) {
            $reasons[] = 'Baisse de '.$number(abs($facts['progression'])).' point(s) depuis la période précédente';
        }

        if ($threshold->sanction_level !== null && $facts['max_sanction'] !== null
            && DisciplineRecord::rank($facts['max_sanction']) >= DisciplineRecord::rank($threshold->sanction_level)) {
            $reasons[] = 'Sanction : '.(DisciplineRecord::LEVELS[$facts['max_sanction']] ?? $facts['max_sanction']);
        }

        return $reasons;
    }

    /** Libellé d'un niveau de pastille. */
    public static function label(?string $level): ?string
    {
        return $level === null ? null : (CouncilStudent::ALERT_LEVELS[$level] ?? $level);
    }
}

<?php

namespace App\Support;

use App\Models\Setting;
use Throwable;

/**
 * Identifiant de mesure Google Analytics 4 (« G-XXXXXXXXXX »), saisi dans Admin > Paramètres. Retourne null tant
 * qu'il n'est pas renseigné (ou s'il est invalide) : aucun script Google n'est alors chargé.
 */
class GoogleAnalytics
{
    public static function id(): ?string
    {
        try {
            $id = strtoupper(trim((string) Setting::get('google_analytics_id')));
        } catch (Throwable) {
            return null;
        }

        return preg_match('/^G-[A-Z0-9]{4,20}$/', $id) ? $id : null;
    }
}

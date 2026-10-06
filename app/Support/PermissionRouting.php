<?php

namespace App\Support;

use Illuminate\Routing\PendingResourceRegistration;

/**
 * Branche les contrôles de permission standard voir/ajouter/modifier/supprimer sur l'enregistrement d'une
 * route de ressource, afin que « Rôles & permissions » soit réellement appliqué au lieu d'être décoratif.
 * Référencer une méthode que la ressource n'enregistre pas (p. ex. une action exclue) est sans conséquence —
 * Laravel se contente de conserver l'entrée inutilisée.
 */
class PermissionRouting
{
    public static function gate(PendingResourceRegistration $resource, string $module): PendingResourceRegistration
    {
        return $resource
            ->middlewareFor(['index', 'show'], "permission:voir_{$module}")
            ->middlewareFor(['create', 'store'], "permission:ajouter_{$module}")
            ->middlewareFor(['edit', 'update'], "permission:modifier_{$module}")
            ->middlewareFor(['destroy'], "permission:supprimer_{$module}");
    }
}

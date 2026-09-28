<?php

namespace App\Support;

use Illuminate\Routing\PendingResourceRegistration;

/**
 * Wires the standard voir/ajouter/modifier/supprimer permission checks onto a
 * resource route registration, so "Rôles & permissions" is actually enforced
 * instead of being decorative. Referencing a method the resource doesn't
 * register (e.g. an excepted action) is harmless — Laravel simply stores the
 * unused entry.
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

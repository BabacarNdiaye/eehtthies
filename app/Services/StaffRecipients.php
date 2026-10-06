<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class StaffRecipients
{
    /**
     * Rôles disposant de leur propre portail dédié au lieu du back-office — reflète
     * App\Http\Middleware\EnsureUserIsStaff. Certains de ces rôles reçoivent aussi (curieusement, mais
     * volontairement laissé tel quel) des permissions d'administration comme `voir_statistiques` dans les
     * données de départ, pour des fonctions de portail sans rapport ; cette exclusion compte donc même quand
     * on filtre par permission.
     */
    private const PORTAL_ONLY_ROLES = ['eleve', 'parent'];

    /**
     * Utilisateurs du personnel (donc ni élèves ni parents) détenant la permission donnée — le public visé
     * par les e-mails de synthèse internes.
     */
    public static function withPermission(string $permission): Collection
    {
        return User::permission($permission)
            ->get()
            ->filter(fn (User $user) => $user->roles->pluck('name')->diff(self::PORTAL_ONLY_ROLES)->isNotEmpty())
            ->values();
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class StaffRecipients
{
    /**
     * Roles with their own dedicated portal instead of the back-office —
     * mirrors App\Http\Middleware\EnsureUserIsStaff. Some of these roles are
     * (oddly, but intentionally left as-is) also granted admin permissions
     * like `voir_statistiques` in the seeded data for unrelated portal
     * features, so this exclusion matters even when filtering by permission.
     */
    private const PORTAL_ONLY_ROLES = ['eleve', 'parent'];

    /**
     * Staff users (i.e. not students/parents) holding the given permission —
     * the intended audience for internal admin digest e-mails.
     */
    public static function withPermission(string $permission): Collection
    {
        return User::permission($permission)
            ->get()
            ->filter(fn (User $user) => $user->roles->pluck('name')->diff(self::PORTAL_ONLY_ROLES)->isNotEmpty())
            ->values();
    }
}

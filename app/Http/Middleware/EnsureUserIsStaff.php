<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsStaff
{
    /**
     * Roles with their own dedicated portal instead of the back-office
     * (students, parents, teachers). Any other role — including custom
     * roles created from Administration > Rôles & permissions — is staff.
     *
     * Teachers are portal-only even though their role is granted full
     * voir/ajouter/modifier/supprimer permissions on notes, examens,
     * presences and emploi_du_temps: those permissions are meant to work
     * through the teacher-scoped portal controllers (Portal\TeacherExamController,
     * Portal\TeacherAttendanceController, etc.), which filter by the
     * teacher's own classes. The shared Admin\* controllers behind those
     * same permission gates do NOT filter by class ownership, so a teacher
     * who reached them directly could edit any class's exams or attendance —
     * blocking /admin/* entirely for this role is what actually enforces
     * "only your own classes".
     */
    private const PORTAL_ONLY_ROLES = ['eleve', 'parent', 'enseignant'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $hasStaffRole = $user && $user->roles->pluck('name')->diff(self::PORTAL_ONLY_ROLES)->isNotEmpty();

        abort_unless($hasStaffRole, 403);

        return $next($request);
    }
}

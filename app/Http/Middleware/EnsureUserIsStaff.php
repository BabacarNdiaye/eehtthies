<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsStaff
{
    /**
     * Rôles disposant de leur propre portail dédié au lieu du back-office (élèves, parents, enseignants).
     * Tout autre rôle — y compris les rôles personnalisés créés depuis Administration > Rôles & permissions —
     * fait partie du personnel.
     *
     * Les enseignants n'ont accès qu'au portail, alors que leur rôle reçoit toutes les permissions
     * voir/ajouter/modifier/supprimer sur notes, examens, presences et emploi_du_temps : ces permissions sont
     * faites pour passer par les contrôleurs du portail limités à l'enseignant (Portal\TeacherExamController,
     * Portal\TeacherAttendanceController, etc.), qui filtrent selon les propres classes de l'enseignant. Les
     * contrôleurs Admin\* partagés derrière ces mêmes permissions ne filtrent PAS selon la propriété des
     * classes ; un enseignant qui les atteindrait directement pourrait donc modifier les examens ou la
     * présence de n'importe quelle classe — bloquer entièrement /admin/* pour ce rôle est ce qui impose
     * réellement « uniquement vos propres classes ».
     */
    private const PORTAL_ONLY_ROLES = ['eleve', 'parent', 'enseignant'];

    /**
     * Faire partie du personnel : avoir au moins un rôle autre que ceux des portails. Les rôles élève et parent peuvent
     * porter des permissions (les données de départ les leur donnent toutes) : une permission seule ne prouve donc jamais
     * qu'on est du personnel, hors de /admin il faut aussi cette règle.
     */
    public static function isStaff(?User $user): bool
    {
        return $user !== null && $user->roles->pluck('name')->diff(self::PORTAL_ONLY_ROLES)->isNotEmpty();
    }

    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(self::isStaff($request->user()), 403);

        return $next($request);
    }
}

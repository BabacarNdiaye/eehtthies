<?php

namespace App\Policies;

use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Council;
use App\Models\User;

/**
 * Qui peut quoi sur un conseil de classe (matrice §2.2 du cahier des charges). Deux sources de droit :
 *  - une permission du catalogue, mais seulement pour le personnel : les rôles « eleve » et « parent » reçoivent toutes
 *    les permissions dans les données de départ, une permission seule ne prouve donc rien ;
 *  - une fonction dans CE conseil (président, professeur principal, secrétaire, membre), qui ne vaut que pour lui.
 */
class CouncilPolicy
{
    private function staffCan(User $user, string $permission): bool
    {
        return EnsureUserIsStaff::isStaff($user) && $user->can($permission);
    }

    private function holds(User $user, Council $council, string ...$functions): bool
    {
        foreach ($functions as $function) {
            if ($council->{$function.'_id'} === $user->id) {
                return true;
            }
        }

        return false;
    }

    public function isMember(User $user, Council $council): bool
    {
        return $this->holds($user, $council, 'president', 'main_teacher', 'secretary')
            || $council->members()->where('user_id', $user->id)->exists();
    }

    public function viewAny(User $user): bool
    {
        return $this->staffCan($user, 'voir_conseils');
    }

    public function view(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'voir_conseils') || $this->isMember($user, $council);
    }

    public function create(User $user): bool
    {
        return $this->staffCan($user, 'ajouter_conseils');
    }

    /** Cadre et membres : Direction et responsable pédagogique, en brouillon ou programmé (§3.2). */
    public function update(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'ajouter_conseils') && $council->isFrameEditable();
    }

    public function delete(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'supprimer_conseils') && $council->status === Council::DRAFT;
    }

    /** Programmer, annuler la programmation, rafraîchir la photo. */
    public function schedule(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'ajouter_conseils');
    }

    /** Démarrer et conduire la séance, faire l'appel, enregistrer les décisions : président ou responsable pédagogique. */
    public function conduct(User $user, Council $council): bool
    {
        return $this->holds($user, $council, 'president') || $this->staffCan($user, 'modifier_conseils');
    }

    /** Synthèse et recommandation par élève (PRE-05) : professeur principal, président, responsable pédagogique. */
    public function writeSynthesis(User $user, Council $council): bool
    {
        return $this->holds($user, $council, 'main_teacher', 'president') || $this->staffCan($user, 'modifier_conseils');
    }

    /**
     * Observations internes : tous sauf le secrétariat (et, pour un enseignant membre, seulement ses élèves : voir le
     * présentateur de la fiche). Le secrétariat n'a ni `modifier_conseils` ni `voir_discipline`.
     */
    public function viewInternal(User $user, Council $council): bool
    {
        return $this->holds($user, $council, 'president', 'main_teacher')
            || $this->staffCan($user, 'modifier_conseils')
            || $this->staffCan($user, 'voir_discipline')
            || $council->members()->where('user_id', $user->id)->where('function', 'teacher')->exists();
    }

    /** Détail des sanctions : vie scolaire, Direction, président, professeur principal ; jamais un simple enseignant. */
    public function viewDiscipline(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'voir_discipline') || $this->holds($user, $council, 'president', 'main_teacher');
    }

    public function export(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'exporter_conseils') || $this->holds($user, $council, 'president', 'main_teacher');
    }

    /** Compléter et soumettre le PV : secrétaire de séance ou responsable pédagogique. */
    public function submit(User $user, Council $council): bool
    {
        return $this->holds($user, $council, 'secretary') || $this->staffCan($user, 'modifier_conseils');
    }

    public function validatePedagogical(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'valider_conseils');
    }

    /** Étape Direction, clôture et rectification. */
    public function validateDirection(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'valider_conseils_direction');
    }

    /** DIR-07 : prévenir les familles après la clôture (envoi manuel) : Direction et responsable pédagogique. */
    public function notifyFamilies(User $user, Council $council): bool
    {
        return $council->isClosed() && ($this->staffCan($user, 'modifier_conseils') || $this->staffCan($user, 'valider_conseils_direction'));
    }

    /** Journal d'audit du conseil (E08) : Direction et responsable pédagogique. */
    public function viewAudit(User $user, Council $council): bool
    {
        return $this->staffCan($user, 'modifier_conseils') || $this->staffCan($user, 'valider_conseils_direction');
    }
}

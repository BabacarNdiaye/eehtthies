<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Student;
use Illuminate\Console\Command;

class RetireCqpUmbrellaFormation extends Command
{
    protected $signature = 'app:retire-cqp-umbrella-formation';

    protected $description = 'Ponctuelle : la formation CQP était une fiche fourre-tout unique couvrant 6 spécialités différentes (caisse, barista, pâtisserie, cuisine, service, guidage), ce qui rendait fausse la formulation de spécialité du PDF de diplôme pour la plupart des diplômés. Chaque spécialité a désormais sa propre fiche exacte ; cette commande désactive donc le CQP (le masque du site public) sans le supprimer — tout élève déjà lié conserve son dossier intact.';

    public function handle(): int
    {
        $cqp = Formation::where('code', 'CQP')->first();

        if (! $cqp) {
            $this->info('Aucune formation CQP trouvée — rien à faire.');

            return self::SUCCESS;
        }

        $studentCount = Student::where('formation_id', $cqp->id)->count();

        if (! $cqp->is_active) {
            $this->info("CQP déjà inactif ({$studentCount} élève(s) lié(s)) — rien à faire.");

            return self::SUCCESS;
        }

        $cqp->update(['is_active' => false]);

        $this->info("CQP désactivé (masqué du site public, fiche conservée). Élèves liés : {$studentCount}.");

        return self::SUCCESS;
    }
}

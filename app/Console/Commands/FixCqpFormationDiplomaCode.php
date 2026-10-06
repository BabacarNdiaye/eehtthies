<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Setting;
use Illuminate\Console\Command;

class FixCqpFormationDiplomaCode extends Command
{
    protected $signature = 'app:fix-cqp-diploma-code';

    protected $description = "Ponctuelle : définit le code d'abréviation « diploma » de la formation CQP pour qu'elle cesse de dupliquer du texte sur les PDF de diplôme et affiche son badge sur le site public. Protégée pour ne s'exécuter qu'une seule fois.";

    private const DONE_FLAG = 'fix_cqp_diploma_code_done';

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Déjà exécutée, rien à faire.');

            return self::SUCCESS;
        }

        $updated = Formation::where('code', 'CQP')->update(['diploma' => 'CQP']);

        Setting::set(self::DONE_FLAG, json_encode(['ran_at' => now()->toDateTimeString(), 'updated' => $updated]));

        $this->info("{$updated} formation(s) mise(s) à jour.");

        return self::SUCCESS;
    }
}

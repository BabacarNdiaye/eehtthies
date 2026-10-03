<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Setting;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class ApplyDiplomaWordingUpgrade2026 extends Command
{
    protected $signature = 'app:apply-diploma-wording-upgrade-2026';

    protected $description = "Ponctuelle : exécute les migrations en attente, définit la spécialité du CQP et renseigne students.training_duration à partir de storage/app/graduates-durations-2026.csv. Protégée pour ne s'exécuter qu'une seule fois.";

    private const DONE_FLAG = 'diploma_wording_upgrade_2026_done';

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Déjà exécutée, rien à faire.');

            return self::SUCCESS;
        }

        Artisan::call('migrate', ['--force' => true]);
        $this->info('Sortie de la migration : '.Artisan::output());

        Formation::where('code', 'CQP')->update(['specialty_override' => 'Restauration']);

        $csvPath = storage_path('app/graduates-durations-2026.csv');
        $updated = 0;

        if (is_file($csvPath)) {
            $handle = fopen($csvPath, 'r');
            while (($row = fgetcsv($handle)) !== false) {
                [$matricule, $duration] = $row;
                $count = Student::where('matricule', trim($matricule))->update(['training_duration' => trim($duration)]);
                $updated += $count;
            }
            fclose($handle);
        }

        Setting::set(self::DONE_FLAG, json_encode(['ran_at' => now()->toDateTimeString(), 'durations_updated' => $updated]));

        $this->info("Durées mises à jour : {$updated}");

        return self::SUCCESS;
    }
}

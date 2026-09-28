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

    protected $description = 'One-time: runs pending migrations, sets CQP specialty, and backfills students.training_duration from storage/app/graduates-durations-2026.csv. Guarded to run only once.';

    private const DONE_FLAG = 'diploma_wording_upgrade_2026_done';

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Already ran, skipping.');

            return self::SUCCESS;
        }

        Artisan::call('migrate', ['--force' => true]);
        $this->info('Migrate output: '.Artisan::output());

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

        $this->info("Durations updated: {$updated}");

        return self::SUCCESS;
    }
}

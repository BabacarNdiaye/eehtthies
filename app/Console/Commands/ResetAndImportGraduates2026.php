<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Setting;
use App\Models\Student;
use App\Support\InstitutionalEmail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class ResetAndImportGraduates2026 extends Command
{
    protected $signature = 'app:reset-import-graduates-2026';

    protected $description = 'One-time: backs up the DB, clears existing students, then imports the 2026 graduates CSV. Guarded to run only once.';

    private const DONE_FLAG = 'reset_import_graduates_2026_done';

    private const CLASSE_TO_FORMATION_CODE = [
        'CQP' => 'CQP',
        'CAP' => 'CAP-REST',
        'BEP' => 'BEP-REST',
    ];

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Already ran, skipping.');

            return self::SUCCESS;
        }

        try {
            Artisan::call('backup:run');
            Log::info('reset-import-graduates-2026: backup done, output: '.Artisan::output());
        } catch (\Throwable $e) {
            // The zip file itself is written to disk before Spatie Backup's
            // notification step runs, so a notification-only failure (e.g.
            // the admin mailbox rejecting mail) shouldn't block the import —
            // just log it and continue, the safety-net file still exists.
            Log::warning('reset-import-graduates-2026: backup:run raised, continuing anyway: '.$e->getMessage());
        }

        Formation::firstOrCreate(
            ['code' => 'CQP'],
            ['name' => 'Certificat de Qualification Professionnelle'],
        );

        $formationIdByCode = Formation::whereIn('code', ['CQP', 'CAP-REST', 'BEP-REST'])
            ->pluck('id', 'code');

        $deleted = Student::count();
        Student::query()->delete();

        $csvPath = storage_path('app/graduates-2026.csv');
        $handle = fopen($csvPath, 'r');
        $header = fgetcsv($handle);

        $created = 0;
        $errors = [];

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);

            $classe = trim($data['classe'] ?? '');
            $formationCode = self::CLASSE_TO_FORMATION_CODE[$classe] ?? null;
            $formationId = $formationCode ? ($formationIdByCode[$formationCode] ?? null) : null;

            $firstName = trim($data['prenom'] ?? '');
            $lastName = trim($data['nom'] ?? '');
            $gender = strtoupper(trim($data['sexe'] ?? '')) ?: null;
            $birthDate = trim($data['date_naissance'] ?? '') ?: null;
            $birthPlace = trim($data['lieu_naissance'] ?? '') ?: null;
            $promotion = trim($data['promotion'] ?? '');
            $graduationYear = null;
            if (preg_match('/(\d{4})\D*$/', $promotion, $m)) {
                $graduationYear = (int) $m[1];
            }

            if ($firstName === '' || $lastName === '' || empty($data['matricule'])) {
                $errors[] = 'Skipped row (missing required field): '.json_encode($data);

                continue;
            }

            try {
                Student::create([
                    'matricule' => trim($data['matricule']),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => in_array($gender, ['M', 'F'], true) ? $gender : null,
                    'birth_date' => $birthDate,
                    'birth_place' => $birthPlace,
                    'formation_id' => $formationId,
                    'status' => 'diplome',
                    'graduation_year' => $graduationYear,
                    'email' => InstitutionalEmail::generate("{$firstName} {$lastName}"),
                ]);
                $created++;
            } catch (\Throwable $e) {
                $errors[] = "Row {$data['matricule']}: {$e->getMessage()}";
            }
        }
        fclose($handle);

        Setting::set(self::DONE_FLAG, json_encode([
            'ran_at' => now()->toDateTimeString(),
            'deleted_previous_students' => $deleted,
            'created' => $created,
            'errors' => $errors,
        ]));

        Log::info('reset-import-graduates-2026: done', [
            'deleted' => $deleted,
            'created' => $created,
            'errors' => $errors,
        ]);

        $this->info("Deleted {$deleted}, created {$created}, errors: ".count($errors));

        return self::SUCCESS;
    }
}

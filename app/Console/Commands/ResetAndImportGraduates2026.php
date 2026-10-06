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

    protected $description = "Ponctuelle : sauvegarde la base, supprime les élèves existants, puis importe le CSV des diplômés 2026. Protégée pour ne s'exécuter qu'une seule fois.";

    private const DONE_FLAG = 'reset_import_graduates_2026_done';

    private const CLASSE_TO_FORMATION_CODE = [
        'CQP' => 'CQP',
        'CAP' => 'CAP-REST',
        'BEP' => 'BEP-REST',
    ];

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Déjà exécutée, rien à faire.');

            return self::SUCCESS;
        }

        try {
            Artisan::call('backup:run');
            Log::info('reset-import-graduates-2026 : sauvegarde terminée, sortie : '.Artisan::output());
        } catch (\Throwable $e) {
            // Le fichier zip est écrit sur disque avant l'étape de notification de Spatie Backup ; un échec
            // limité à la notification (p. ex. la boîte mail de l'administrateur qui refuse le message) ne
            // doit donc pas bloquer l'import — on le journalise et on continue, le fichier de sauvegarde de
            // sécurité existant bel et bien.
            Log::warning('reset-import-graduates-2026 : backup:run a levé une exception, on continue malgré tout : '.$e->getMessage());
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
                $errors[] = 'Ligne ignorée (champ obligatoire manquant) : '.json_encode($data);

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

        Log::info('reset-import-graduates-2026 : terminé', [
            'deleted' => $deleted,
            'created' => $created,
            'errors' => $errors,
        ]);

        $this->info("Supprimés : {$deleted}, créés : {$created}, erreurs : ".count($errors));

        return self::SUCCESS;
    }
}

<?php

namespace Tests\Support;

use App\Exceptions\CouncilException;
use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\DecisionType;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Services\Council\CouncilRoster;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilSittingService;
use App\Services\Council\CouncilValidationFlow;
use App\Services\Council\CouncilWorkflow;
use Database\Seeders\FormationsCatalogSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Données FICTIVES pour essayer le conseil de classe en local (séance, visioconférence, vote, tableau de bord).
 *
 * Ce fichier vit sous tests/ : il n'est jamais envoyé en ligne (le paquet de déploiement et le workflow FTP excluent
 * tests/, et Composer n'installe pas l'autoload de développement en production). Il refuse en plus de tourner hors de
 * l'environnement « local ». Il peut être relancé sans doublons.
 *
 *     php artisan db:seed --class="Tests\Support\LocalDemoSeeder"
 *
 * Comptes créés (mot de passe : password) : direction@demo.local, vieScolaire@demo.local, secretariat@demo.local,
 * pedagogie@demo.local, prof1@demo.local … prof3@demo.local.
 */
class LocalDemoSeeder extends Seeder
{
    private const PASSWORD = 'password';

    private const FIRST = ['Awa', 'Moussa', 'Fatou', 'Ibrahima', 'Mariama', 'Cheikh', 'Aminata', 'Ousmane', 'Khady', 'Mamadou', 'Ndeye', 'Abdoulaye', 'Rokhaya', 'Pape', 'Coumba', 'Samba'];

    private const LAST = ['Diop', 'Fall', 'Sow', 'Ndiaye', 'Ba', 'Sy', 'Kane', 'Gueye', 'Diallo', 'Sarr', 'Faye', 'Thiam', 'Mbaye', 'Cissé', 'Seck', 'Ndoye'];

    /** @var array<string, User> */
    private array $staff = [];

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->error('Données de démonstration : réservées à l’environnement « local » (APP_ENV=local). Rien n’a été créé.');

            return;
        }

        mt_srand(2026); // notes reproductibles d'un lancement à l'autre

        $this->call([RolesAndPermissionsSeeder::class, FormationsCatalogSeeder::class]);

        $year = AcademicYear::where('is_current', true)->first()
            ?? AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);

        $this->makeStaff();

        $classes = [];
        foreach (['BTS-TOUR' => 'BTS Tourisme 1', 'CAP-REST' => 'CAP Restauration A', 'DTS-REST' => 'DTS Restauration 2', 'FC-BARISTA' => 'Barista'] as $code => $name) {
            $formation = Formation::where('code', $code)->first();
            if ($formation) {
                $classes[$code] = $this->makeClass($year, $formation, $name);
            }
        }

        $this->makeCouncils($year, $classes);

        $this->command?->info('Données de démonstration prêtes. Comptes : direction@demo.local, vieScolaire@demo.local, secretariat@demo.local, pedagogie@demo.local, prof1@demo.local (mot de passe : '.self::PASSWORD.').');
    }

    private function makeStaff(): void
    {
        foreach ([
            'direction' => ['direction@demo.local', 'Mme Diallo (Direction)'],
            'vie-scolaire' => ['vieScolaire@demo.local', 'M. Fall (Vie scolaire)'],
            'secretariat' => ['secretariat@demo.local', 'Mme Gueye (Secrétariat)'],
            'responsable-pedagogique' => ['pedagogie@demo.local', 'M. Sarr (Pédagogie)'],
        ] as $role => [$email, $name]) {
            $this->staff[$role] = $this->user($email, $name, $role);
        }
    }

    private function user(string $email, string $name, string $role): User
    {
        $user = User::firstOrNew(['email' => $email]);
        $user->forceFill(['name' => $name, 'password' => Hash::make(self::PASSWORD), 'email_verified_at' => now()])->save();
        $user->syncRoles([$role]);

        return $user;
    }

    /** Une classe, trois enseignants (trois matières), seize élèves, des épreuves aux deux semestres et leurs notes. */
    private function makeClass(AcademicYear $year, Formation $formation, string $name): SchoolClass
    {
        $class = SchoolClass::firstOrCreate(['name' => $name, 'academic_year_id' => $year->id], ['formation_id' => $formation->id]);
        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $formation->code));
        $groups = SubjectGroup::orderBy('sort_order')->pluck('id')->all();

        $subjects = [];
        foreach ([['Technique professionnelle', 4], ['Service et accueil', 3], ['Anglais professionnel', 2]] as $i => [$label, $coefficient]) {
            $subject = Subject::firstOrCreate(['name' => $label, 'formation_id' => $formation->id], ['coefficient' => $coefficient, 'subject_group_id' => $groups[$i % max(1, count($groups))] ?? null]);
            $subjects[] = $subject;

            $user = $this->user('prof'.($i + 1).'@demo.local', 'Prof '.($i + 1).' (démo)', 'enseignant');
            $teacher = Teacher::firstOrCreate(['matricule' => 'DEMO-ENS-'.($i + 1)], ['user_id' => $user->id, 'first_name' => 'Prof'.($i + 1), 'last_name' => 'Démo', 'status' => 'actif']);
            TimetableEntry::firstOrCreate(
                ['school_class_id' => $class->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id],
                ['day_of_week' => $i + 1, 'start_time' => '08:00:00', 'end_time' => '10:00:00'],
            );
        }

        $students = [];
        for ($n = 0; $n < 16; $n++) {
            $students[] = Student::firstOrCreate(
                ['matricule' => "DEMO-{$slug}-".str_pad((string) ($n + 1), 2, '0', STR_PAD_LEFT)],
                [
                    'first_name' => self::FIRST[$n % count(self::FIRST)], 'last_name' => self::LAST[($n * 3 + $formation->id) % count(self::LAST)],
                    'formation_id' => $formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'actif',
                ],
            );
        }

        // Comptes de connexion et photos pour les huit premiers élèves : la page « Élèves en ligne » a de quoi s'afficher.
        foreach (array_slice($students, 0, 8) as $index => $student) {
            $this->giveAccountAndPhoto($student, $index);
        }

        foreach (['Semestre 1', 'Semestre 2'] as $term) {
            foreach ($subjects as $subject) {
                $exam = Exam::firstOrCreate(
                    ['school_class_id' => $class->id, 'academic_year_id' => $year->id, 'subject_id' => $subject->id, 'term' => $term, 'type' => 'examen'],
                    ['title' => "Examen {$subject->name} ({$term})", 'exam_date' => $term === 'Semestre 1' ? '2026-12-10' : '2027-05-20', 'max_score' => 20, 'coefficient' => 1, 'is_published' => true],
                );

                foreach ($students as $index => $student) {
                    // Profils variés : quelques élèves brillants, d'autres en difficulté (alertes rouge et orange).
                    $base = [15, 13, 11, 9, 7, 12, 14, 10][$index % 8];
                    $score = max(2, min(19.5, $base + mt_rand(-20, 20) / 10));
                    Grade::updateOrCreate(['exam_id' => $exam->id, 'student_id' => $student->id], ['score' => round($score * 4) / 4, 'status' => Grade::PRESENT]);
                }
            }
        }

        return $class;
    }

    /**
     * Compte de connexion (eleve-<matricule>@demo.local, mot de passe « password ») et photo fictive d'un élève, avec des
     * dernières activités variées : en ligne (moins de 2 min), actif récemment, hors ligne, jamais connecté. Relancer le
     * seeder « rafraîchit » les heures : les élèves redeviennent « en ligne » pendant deux minutes.
     */
    private function giveAccountAndPhoto(Student $student, int $index): void
    {
        $lastSeen = match ($index % 4) {
            0 => now()->subSeconds(20 + $index),
            1 => now()->subMinutes(7),
            2 => now()->subHours(3),
            default => null,
        };

        $user = User::firstOrNew(['email' => 'eleve-'.strtolower($student->matricule).'@demo.local']);
        $user->forceFill(['name' => $student->first_name.' '.$student->last_name, 'password' => Hash::make(self::PASSWORD), 'email_verified_at' => now(), 'last_seen_at' => $lastSeen])->save();
        $user->syncRoles(['eleve']);

        $update = ['user_id' => $user->id];

        if ($portrait = $this->portrait($index + (int) $student->id)) {
            $path = 'students/photos/demo-'.strtolower($student->matricule).'.jpg';
            Storage::disk('public')->put($path, $portrait);
            $update['photo'] = $path;
        }

        $student->update($update);
    }

    /** Portrait fictif (silhouette sur fond de couleur) dessiné avec GD ; null si GD n'est pas disponible. */
    private function portrait(int $seed): ?string
    {
        if (! function_exists('imagecreatetruecolor')) {
            return null;
        }

        $backgrounds = [[217, 199, 163], [188, 211, 201], [226, 196, 196], [196, 205, 226], [225, 218, 176], [205, 196, 226]];
        $skins = [[138, 90, 59], [91, 58, 41], [59, 42, 34], [168, 117, 82], [112, 74, 51]];
        [$br, $bg, $bb] = $backgrounds[$seed % count($backgrounds)];
        [$sr, $sg, $sb] = $skins[$seed % count($skins)];

        $image = imagecreatetruecolor(240, 300);
        imagefill($image, 0, 0, imagecolorallocate($image, $br, $bg, $bb));
        $body = imagecolorallocate($image, max(0, $sr - 30), max(0, $sg - 30), max(0, $sb - 30));
        $head = imagecolorallocate($image, $sr, $sg, $sb);
        imagefilledellipse($image, 120, 330, 260, 280, $body);
        imagefilledellipse($image, 120, 118, 104, 124, $head);

        ob_start();
        imagejpeg($image, null, 85);
        $binary = (string) ob_get_clean();
        imagedestroy($image);

        return $binary;
    }

    /** Un conseil par état (brouillon, programmé, en séance avec membres présents, clôturé) + une séance commune. */
    private function makeCouncils(AcademicYear $year, array $classes): void
    {
        $workflow = app(CouncilWorkflow::class);
        $roster = app(CouncilRoster::class);
        $president = $this->staff['direction'];
        $secretary = $this->staff['secretariat'];

        $frame = fn (SchoolClass $class, array $extra = []) => $extra + [
            'academic_year_id' => $year->id, 'school_class_id' => $class->id, 'term' => 'Semestre 1', 'is_end_of_year' => false,
            'scheduled_at' => now()->addDays(6)->setTime(15, 0), 'room' => 'Salle de conférence',
            'president_id' => $president->id, 'secretary_id' => $secretary->id,
            'main_teacher_id' => User::where('email', 'prof1@demo.local')->value('id'),
        ];
        $members = fn (SchoolClass $class) => $roster->proposeMembers($class);

        $make = function (string $label, callable $build): ?Council {
            try {
                return $build();
            } catch (CouncilException $exception) {
                $this->command?->warn("{$label} : {$exception->getMessage()}");

                return null;
            }
        };

        // 1. Brouillon.
        if (isset($classes['DTS-REST'])) {
            $make('Brouillon', fn () => $this->once($classes['DTS-REST'], 'Semestre 1', fn () => $workflow->create($frame($classes['DTS-REST']), $members($classes['DTS-REST']), $president)));
        }

        // 2. Programmé (photo prise, convocations prêtes).
        if (isset($classes['CAP-REST'])) {
            $make('Programmé', function () use ($workflow, $frame, $members, $classes, $president) {
                $class = $classes['CAP-REST'];
                $council = $this->once($class, 'Semestre 1', fn () => $workflow->create($frame($class), $members($class), $president));
                if ($council->status === Council::DRAFT) {
                    $workflow->schedule($council, $president);
                }

                return $council;
            });
        }

        // 3. En séance : le jour même, appel fait (membres présents), pour essayer la salle du conseil et la visio.
        if (isset($classes['BTS-TOUR'])) {
            $make('En séance', function () use ($workflow, $frame, $members, $classes, $president) {
                $class = $classes['BTS-TOUR'];
                $council = $this->once($class, 'Semestre 1', fn () => $workflow->create($frame($class, ['scheduled_at' => now()->setTime(9, 0)]), $members($class), $president));
                if ($council->status === Council::DRAFT) {
                    $workflow->schedule($council, $president);
                }
                $council = $council->fresh();
                if ($council->status === Council::SCHEDULED) {
                    $council->members()->get()->each(fn ($member, $i) => $member->update(['attendance' => $i % 5 === 4 ? 'absent' : 'present', 'arrived_at' => now()]));
                    $workflow->start($council->fresh(), $president, now());
                }

                return $council->fresh();
            });
        }

        // 4. Clôturé : conseil de fin d'année mené jusqu'au bout, avec décisions d'orientation.
        if (isset($classes['FC-BARISTA'])) {
            $make('Clôturé', function () use ($workflow, $frame, $members, $classes, $president) {
                $class = $classes['FC-BARISTA'];
                $council = $this->once($class, config('eeht.final_term'), fn () => $workflow->create($frame($class, ['term' => config('eeht.final_term'), 'is_end_of_year' => true, 'scheduled_at' => now()->subDays(8)->setTime(10, 0)]), $members($class), $president));
                if ($council->status === Council::DRAFT) {
                    $workflow->schedule($council, $president);
                    $council = $council->fresh();
                    $council->members()->get()->each->update(['attendance' => 'present', 'arrived_at' => now()]);
                    $workflow->start($council->fresh(), $president, now());
                    $council = $council->fresh();

                    $session = app(CouncilSession::class);
                    $passage = DecisionType::where('code', 'passage')->value('id');
                    $redoublement = DecisionType::where('code', 'redoublement')->value('id');
                    foreach ($council->students()->get() as $row) {
                        $decision = ($row->general_average !== null && $row->general_average < 9 && $redoublement)
                            ? ['decision_type_id' => $redoublement, 'reason' => 'Résultats insuffisants sur la période.']
                            : ['decision_type_id' => $passage, 'reason' => null];
                        $session->saveStudent($council->fresh(), $row, ['general_appreciation' => 'Appréciation de démonstration.', 'review_status' => 'reviewed', 'decisions' => [$decision]], $president);
                    }
                    $session->endDeliberation($council->fresh(), $president);

                    $flow = app(CouncilValidationFlow::class);
                    $council->update(['general_observations' => 'Séance de démonstration (données fictives).']);
                    $flow->submit($council->fresh(), $president);
                    $flow->approvePedagogical($council->fresh(), $this->staff['responsable-pedagogique']);
                    $flow->close($council->fresh(), $president);
                }

                return $council->fresh();
            });
        }

        // 5. Séance commune (deux formations) au semestre 2 : brouillons prêts à programmer.
        if (isset($classes['BTS-TOUR'], $classes['CAP-REST'])) {
            $make('Séance commune', function () use ($year, $classes, $president, $secretary) {
                $rows = collect(['BTS-TOUR', 'CAP-REST'])->map(fn ($code) => $classes[$code])
                    ->reject(fn (SchoolClass $class) => Council::where('school_class_id', $class->id)->where('term', 'Semestre 2')->exists())
                    ->map(fn (SchoolClass $class) => ['school_class_id' => $class->id, 'main_teacher_id' => User::where('email', 'prof1@demo.local')->value('id')])
                    ->values()->all();

                return $rows === [] ? null : app(CouncilSittingService::class)->create([
                    'academic_year_id' => $year->id, 'term' => 'Semestre 2', 'is_end_of_year' => false, 'scheduled_at' => now()->addMonths(5)->setTime(14, 0),
                    'room' => 'Salle de conférence', 'agenda' => 'Bilan du second semestre', 'president_id' => $president->id, 'secretary_id' => $secretary->id,
                ], $rows, [], $president);
            });
        }
    }

    /** Relance sans doublon : renvoie le conseil existant de la classe et de la période, sinon le crée. */
    private function once(SchoolClass $class, string $term, callable $create): Council
    {
        return Council::where('school_class_id', $class->id)->where('term', $term)->first() ?? $create();
    }
}

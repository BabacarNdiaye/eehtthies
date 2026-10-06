<?php

namespace Tests\Concerns;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\LessonLog;
use App\Models\PayrollLine;
use App\Models\PayrollRun;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

/**
 * Décor commun aux tests de la paie mensuelle : du personnel et des enseignants rémunérés, des séances au cahier de
 * texte, et un cycle préparé par le vrai contrôleur (c'est lui que l'on teste, pas un raccourci).
 */
trait BuildsPayroll
{
    private ?SchoolClass $payrollClass = null;

    private ?Subject $payrollSubject = null;

    /** Membre du personnel administratif à salaire fixe (rôle autre qu'enseignant, élève ou parent). */
    protected function payrollStaff(string $name = 'Awa Sow', ?float $salary = 250000, string $role = 'comptable', array $attributes = []): User
    {
        $user = User::factory()->create($attributes + [
            'name' => $name, 'position' => 'Comptable', 'monthly_salary' => $salary, 'is_active' => true,
        ]);
        $user->assignRole($role);

        return $user;
    }

    /**
     * Membre du personnel d'un rôle neutre (sans aucune permission) à qui l'on donne seulement les permissions voulues. Un
     * utilisateur sans aucun rôle recevrait un 403 du middleware du personnel : le test ne prouverait plus la permission.
     */
    protected function payrollActor(string ...$permissions): User
    {
        Role::findOrCreate('auxiliaire-test', 'web');

        $user = User::factory()->create();
        $user->assignRole('auxiliaire-test');
        $user->givePermissionTo($permissions);

        return $user;
    }

    protected function payrollTeacher(string $first = 'Fatou', string $type = 'fixe', ?float $monthly = 300000, ?float $rate = null, array $attributes = []): Teacher
    {
        return Teacher::create($attributes + [
            'matricule' => 'PROF-'.uniqid(), 'first_name' => $first, 'last_name' => 'Ba', 'status' => 'actif', 'specialty' => 'Cuisine',
            'payment_type' => $type, 'monthly_salary' => $monthly, 'hourly_rate' => $rate,
        ]);
    }

    /** Séance du cahier de texte ; avec `$slot` à null, elle n'est reliée à aucun créneau de l'emploi du temps. */
    protected function payrollSession(Teacher $teacher, string $date, ?array $slot = ['08:00', '10:00']): LessonLog
    {
        if (! $this->payrollClass) {
            $formation = Formation::create(['name' => 'Formation paie', 'code' => 'PAI-'.uniqid(), 'slug' => 'paie-'.uniqid()]);
            $year = AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
            $this->payrollClass = SchoolClass::create(['name' => 'Classe paie', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
            $this->payrollSubject = Subject::create(['name' => 'Matière paie', 'coefficient' => 1, 'formation_id' => $formation->id]);
        }

        $entry = $slot ? TimetableEntry::create([
            'school_class_id' => $this->payrollClass->id, 'subject_id' => $this->payrollSubject->id, 'teacher_id' => $teacher->id,
            'day_of_week' => Carbon::parse($date)->dayOfWeekIso, 'start_time' => $slot[0], 'end_time' => $slot[1],
        ]) : null;

        return LessonLog::create([
            'timetable_entry_id' => $entry?->id, 'teacher_id' => $teacher->id, 'school_class_id' => $this->payrollClass->id,
            'subject_id' => $this->payrollSubject->id, 'date' => $date, 'content' => 'Séance du '.$date,
        ]);
    }

    /** Prépare un mois par la route réelle, en tant qu'administrateur, et renvoie le cycle créé. */
    protected function prepareRun(User $by, int $year = 2026, int $month = 10): PayrollRun
    {
        $this->actingAs($by)->post(route('admin.payroll.store'), ['period_year' => $year, 'period_month' => $month])->assertSessionHasNoErrors();

        return PayrollRun::where('period_year', $year)->where('period_month', $month)->firstOrFail();
    }

    /** La ligne d'un membre du personnel ou d'un enseignant dans un cycle. */
    protected function lineFor(PayrollRun $run, User|Teacher $payee): PayrollLine
    {
        return $run->lines()
            ->where($payee instanceof User ? 'user_id' : 'teacher_id', $payee->id)
            ->firstOrFail();
    }

    /** Montant JSON (entier ou décimal) comparé sans dépendre de son type. */
    protected function amount(float $expected): \Closure
    {
        return fn ($value) => (float) $value === $expected;
    }
}

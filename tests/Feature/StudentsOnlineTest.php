<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * « Élèves en ligne » : la présence vient de users.last_seen_at (TrackLastSeen). Un élève est « en ligne » s'il a été
 * actif il y a moins de 2 minutes, « récent » il y a moins de 15 ; sans compte, il n'apparaît pas dans la liste mais
 * est compté à part. La page demande le droit de voir les élèves.
 */
class StudentsOnlineTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Tourisme', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
    }

    private function pupil(string $first, ?\DateTimeInterface $lastSeen, bool $withAccount = true): Student
    {
        $userId = null;

        if ($withAccount) {
            $user = User::factory()->create();
            $user->forceFill(['last_seen_at' => $lastSeen])->save();
            $userId = $user->id;
        }

        return Student::create([
            'user_id' => $userId, 'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => 'Diop',
            'formation_id' => $this->class->formation_id, 'school_class_id' => $this->class->id,
            'academic_year_id' => $this->class->academic_year_id, 'status' => 'actif',
        ]);
    }

    private function admin(string $role = 'direction'): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_it_counts_online_recent_and_accountless_students(): void
    {
        $this->pupil('Awa', now()->subSeconds(30));
        $this->pupil('Moussa', now()->subMinutes(8));
        $this->pupil('Fatou', now()->subDays(2));
        $this->pupil('Ibrahima', null, withAccount: false);

        $this->actingAs($this->admin())->get(route('admin.students.online'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Students/Online')
                ->where('counts.online', 1)
                ->where('counts.recent', 2)
                ->where('counts.with_account', 3)
                ->where('counts.without_account', 1)
                ->has('students.data', 2)); // onglet par défaut : actifs depuis moins de 15 minutes
    }

    public function test_the_online_tab_lists_only_students_seen_in_the_last_two_minutes_most_recent_first(): void
    {
        $this->pupil('Ancien', now()->subMinutes(10));
        $this->pupil('Maintenant', now()->subSeconds(10));
        $this->pupil('Presque', now()->subSeconds(90));

        $this->actingAs($this->admin())->get(route('admin.students.online', ['state' => 'online']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('students.data', 2)
                ->where('students.data.0.name', 'Maintenant Diop')
                ->where('students.data.0.state', 'online')
                ->where('students.data.1.name', 'Presque Diop'));
    }

    public function test_the_page_follows_the_students_permission(): void
    {
        $this->actingAs($this->admin('caissier'))->get(route('admin.students.online'))->assertForbidden();
        $this->actingAs($this->admin('direction'))->get(route('admin.students.online'))->assertOk();
    }
}

<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentListByClassTest extends TestCase
{
    use RefreshDatabase;

    private function student(string $last, ?SchoolClass $class): Student
    {
        return Student::create([
            'matricule' => 'M-'.$last,
            'first_name' => 'Aminata',
            'last_name' => $last,
            'school_class_id' => $class?->id,
            'status' => 'actif',
        ]);
    }

    private function makeClass(string $name): SchoolClass
    {
        $formation = Formation::firstOrCreate(['code' => 'BAC'], ['name' => 'Bac Pro', 'slug' => 'bac-pro']);

        $year = AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);

        return SchoolClass::create(['name' => $name, 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
    }

    private function staff(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        return $user;
    }

    public function test_students_are_listed_by_class_then_by_name_with_unassigned_last(): void
    {
        $user = $this->staff();
        $b = $this->makeClass('Bac 2');
        $a = $this->makeClass('Bac 1');
        $this->student('Sow', $b);
        $this->student('Zidane', null);
        $this->student('Ba', $b);
        $this->student('Fall', $a);

        $response = $this->actingAs($user)->get(route('admin.students.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('students.data.0.last_name', 'Fall')
            ->where('students.data.1.last_name', 'Ba')
            ->where('students.data.2.last_name', 'Sow')
            ->where('students.data.3.last_name', 'Zidane')
        );
    }

    public function test_class_totals_are_provided_for_group_headers(): void
    {
        $user = $this->staff();
        $a = $this->makeClass('Bac 1');
        $this->student('Fall', $a);
        $this->student('Diop', $a);
        $this->student('Zidane', null);

        $response = $this->actingAs($user)->get(route('admin.students.index'));

        $response->assertInertia(fn ($page) => $page
            ->where("classCounts.{$a->id}", 2)
            ->where('classCounts.none', 1)
        );
    }

    public function test_students_can_be_filtered_by_class(): void
    {
        $user = $this->staff();
        $a = $this->makeClass('Bac 1');
        $b = $this->makeClass('Bac 2');
        $this->student('Fall', $a);
        $this->student('Sow', $b);

        $response = $this->actingAs($user)->get(route('admin.students.index', ['school_class_id' => $b->id]));

        $response->assertInertia(fn ($page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.last_name', 'Sow')
        );
    }
}

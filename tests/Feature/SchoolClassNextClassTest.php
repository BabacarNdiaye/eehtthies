<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolClassNextClassTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_set_the_next_class_for_promotion(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $yearN = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $yearN1 = AcademicYear::create(['label' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_current' => false]);
        $class1 = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $yearN->id]);
        $class2 = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $formation->id, 'academic_year_id' => $yearN1->id]);

        $response = $this->actingAs($user)->patch(route('admin.school-classes.update', $class1), [
            'name' => $class1->name,
            'formation_id' => $formation->id,
            'academic_year_id' => $yearN->id,
            'next_class_id' => $class2->id,
        ]);

        $response->assertRedirect();
        $this->assertSame($class2->id, $class1->fresh()->next_class_id);
    }

    public function test_a_class_cannot_be_set_as_its_own_next_class(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        $response = $this->actingAs($user)->patch(route('admin.school-classes.update', $class), [
            'name' => $class->name,
            'formation_id' => $formation->id,
            'academic_year_id' => $year->id,
            'next_class_id' => $class->id,
        ]);

        $response->assertSessionHasErrors('next_class_id');
        $this->assertNull($class->fresh()->next_class_id);
    }
}

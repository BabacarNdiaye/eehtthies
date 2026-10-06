<?php

namespace Tests\Feature;

use App\Models\Council;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Supprimer un élève, une classe, une année ou une formation qui figure dans un conseil est refusé avec un message clair,
 * jamais par une erreur SQL : le conseil et son PV doivent survivre.
 */
class CouncilDeletionGuardTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
    }

    public function test_a_student_in_a_council_is_not_deleted(): void
    {
        $student = $this->pupil('Awa');
        $this->makeCouncil();

        $this->actingAs($this->staff('super-admin'))->delete(route('admin.students.destroy', $student))
            ->assertRedirect()->assertSessionHas('error');

        $this->assertModelExists($student);
    }

    public function test_a_class_a_year_and_a_formation_with_a_council_are_not_deleted(): void
    {
        $this->makeCouncil();
        $admin = $this->staff('super-admin');

        $this->actingAs($admin)->delete(route('admin.school-classes.destroy', $this->class))->assertSessionHas('error');
        $this->actingAs($admin)->delete(route('admin.academic-years.destroy', $this->year))->assertSessionHas('error');
        $this->actingAs($admin)->delete(route('admin.formations.destroy', $this->formation))->assertSessionHas('error');

        $this->assertModelExists($this->class);
        $this->assertModelExists($this->year);
        $this->assertModelExists($this->formation);
        $this->assertSame(1, Council::count());
    }

    public function test_without_a_council_deletion_works_as_before(): void
    {
        $student = $this->pupil('Awa');

        $this->actingAs($this->staff('super-admin'))->delete(route('admin.students.destroy', $student))->assertSessionHas('success');

        $this->assertModelMissing($student);
    }
}

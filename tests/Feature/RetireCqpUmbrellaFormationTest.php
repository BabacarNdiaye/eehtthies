<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RetireCqpUmbrellaFormationTest extends TestCase
{
    use RefreshDatabase;

    private function makeCqp(array $overrides = []): Formation
    {
        return Formation::create([
            'name' => 'CQP : Certificat de qualification professionnelle',
            'code' => 'CQP',
            'diploma' => 'CQP',
            'is_active' => true,
            'order' => 0,
            ...$overrides,
        ]);
    }

    public function test_it_deactivates_cqp_without_deleting_it(): void
    {
        $cqp = $this->makeCqp();

        $this->artisan('app:retire-cqp-umbrella-formation')->assertSuccessful();

        $this->assertDatabaseHas('formations', ['id' => $cqp->id, 'code' => 'CQP', 'is_active' => false]);
    }

    public function test_it_keeps_students_linked_to_cqp_intact(): void
    {
        $cqp = $this->makeCqp();
        $student = Student::create([
            'matricule' => 'ENS-TEST-0001',
            'first_name' => 'Test',
            'last_name' => 'Étudiant',
            'formation_id' => $cqp->id,
        ]);

        $this->artisan('app:retire-cqp-umbrella-formation')->assertSuccessful();

        $this->assertDatabaseHas('students', ['id' => $student->id, 'formation_id' => $cqp->id]);
    }

    public function test_it_is_idempotent(): void
    {
        $this->makeCqp(['is_active' => false]);

        $this->artisan('app:retire-cqp-umbrella-formation')->assertSuccessful();

        $this->assertDatabaseCount('formations', 1);
    }

    public function test_it_does_nothing_when_no_cqp_formation_exists(): void
    {
        $this->artisan('app:retire-cqp-umbrella-formation')->assertSuccessful();

        $this->assertDatabaseCount('formations', 0);
    }
}

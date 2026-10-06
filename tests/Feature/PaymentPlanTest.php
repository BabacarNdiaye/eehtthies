<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\PaymentPlan;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentPlanTest extends TestCase
{
    use RefreshDatabase;

    private function makeStudent(): Student
    {
        $formation = Formation::create(['name' => 'Formation PP', 'code' => 'PP-'.uniqid(), 'slug' => 'formation-pp-'.uniqid()]);
        $year = AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $class = SchoolClass::create(['name' => 'Classe PP', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        return Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Test',
            'last_name' => 'Eleve',
            'school_class_id' => $class->id,
            'status' => 'actif',
        ]);
    }

    public function test_creating_a_plan_generates_the_right_number_of_invoices_summing_to_the_total(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier');
        $student = $this->makeStudent();

        $response = $this->actingAs($user)->post(route('admin.payment-plans.store'), [
            'student_id' => $student->id,
            'label' => 'Scolarité 2026-2027',
            'total_amount' => 100000,
            'installments_count' => 3,
            'first_due_date' => '2026-10-01',
        ]);

        $response->assertRedirect();
        $plan = PaymentPlan::firstOrFail();
        $this->assertSame(3, $plan->invoices()->count());
        $this->assertEquals(100000, $plan->invoices()->sum('amount'));

        // Échéances espacées d'un mois.
        $dueDates = $plan->invoices()->orderBy('due_date')->pluck('due_date')->map->format('Y-m-d');
        $this->assertEquals(['2026-10-01', '2026-11-01', '2026-12-01'], $dueDates->all());
    }

    public function test_rounding_remainder_is_folded_into_the_last_tranche(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier');
        $student = $this->makeStudent();

        // 100 / 3 = 33,333… — la dernière tranche doit absorber le reste.
        $this->actingAs($user)->post(route('admin.payment-plans.store'), [
            'student_id' => $student->id,
            'label' => 'Test arrondi',
            'total_amount' => 100,
            'installments_count' => 3,
            'first_due_date' => '2026-10-01',
        ]);

        $plan = PaymentPlan::firstOrFail();
        $amounts = $plan->invoices()->orderBy('id')->pluck('amount')->map(fn ($a) => (float) $a);
        $this->assertEquals([33.33, 33.33, 33.34], $amounts->all());
        $this->assertEquals(100.0, $amounts->sum());
    }

    public function test_user_without_comptabilite_permission_cannot_create_a_plan(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique'); // pas de comptabilite
        $student = $this->makeStudent();

        $response = $this->actingAs($user)->post(route('admin.payment-plans.store'), [
            'student_id' => $student->id,
            'label' => 'Test',
            'total_amount' => 10000,
            'installments_count' => 2,
            'first_due_date' => '2026-10-01',
        ]);

        $response->assertForbidden();
        $this->assertSame(0, PaymentPlan::count());
    }

    public function test_plan_cannot_be_deleted_once_a_tranche_has_a_payment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier');
        $student = $this->makeStudent();

        $this->actingAs($user)->post(route('admin.payment-plans.store'), [
            'student_id' => $student->id,
            'label' => 'Test suppression',
            'total_amount' => 60000,
            'installments_count' => 3,
            'first_due_date' => '2026-10-01',
        ]);
        $plan = PaymentPlan::firstOrFail();
        $firstInvoice = $plan->invoices()->orderBy('id')->first();

        $this->actingAs($user)->post(route('admin.invoices.payments.store', $firstInvoice), [
            'amount' => 20000,
            'method' => 'especes',
            'paid_at' => '2026-10-01',
        ]);

        $response = $this->actingAs($user)->delete(route('admin.payment-plans.destroy', $plan));

        $response->assertStatus(422);
        $this->assertDatabaseHas('payment_plans', ['id' => $plan->id]);
    }

    public function test_plan_can_be_deleted_when_no_tranche_has_a_payment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier');
        $student = $this->makeStudent();

        $this->actingAs($user)->post(route('admin.payment-plans.store'), [
            'student_id' => $student->id,
            'label' => 'Test suppression propre',
            'total_amount' => 30000,
            'installments_count' => 3,
            'first_due_date' => '2026-10-01',
        ]);
        $plan = PaymentPlan::firstOrFail();

        $response = $this->actingAs($user)->delete(route('admin.payment-plans.destroy', $plan));

        $response->assertRedirect();
        $this->assertDatabaseMissing('payment_plans', ['id' => $plan->id]);
        $this->assertDatabaseMissing('invoices', ['payment_plan_id' => $plan->id]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Product;
use App\Models\SchoolClass;
use App\Models\SupplyRequest;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** L'enseignant demande du matériel à l'économat depuis son espace, pour ses propres classes seulement. */
class TeacherSupplyRequestTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private SchoolClass $mine;

    private SchoolClass $other;

    private Product $flour;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->mine = SchoolClass::create(['name' => 'Cuisine 1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->other = SchoolClass::create(['name' => 'Cuisine 2', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        $this->user = User::factory()->create();
        $this->user->assignRole('enseignant');
        $teacher = Teacher::create(['user_id' => $this->user->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif', 'payment_type' => 'fixe']);
        $teacher->schoolClasses()->attach($this->mine);

        $this->flour = Product::create(['name' => 'Farine', 'category' => 'alimentaire', 'unit' => 'kg', 'unit_cost' => 500, 'quantity_in_stock' => 40, 'min_threshold' => 5]);
    }

    public function test_the_page_lists_own_requests_and_hides_stock_levels(): void
    {
        $this->actingAs($this->user)->get(route('teacher.supplies.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/SupplyRequests')
            ->has('classes', 1)
            ->where('classes.0.name', 'Cuisine 1')
            ->has('products', 1, fn (Assert $p) => $p->where('name', 'Farine')->missing('quantity_in_stock')->etc()));
    }

    public function test_a_teacher_sends_a_request_that_the_economat_then_sees(): void
    {
        $this->actingAs($this->user)->post(route('teacher.supplies.store'), [
            'purpose' => 'Atelier pâtisserie',
            'school_class_id' => $this->mine->id,
            'lines' => [['product_id' => $this->flour->id, 'quantity' => 6]],
        ])->assertSessionHas('success');

        $request = SupplyRequest::firstOrFail();
        $this->assertSame($this->user->id, $request->requested_by);
        $this->assertSame('en_attente', $request->status);
        $this->assertCount(1, $request->lines);
    }

    public function test_a_teacher_cannot_request_for_a_class_that_is_not_theirs(): void
    {
        $this->actingAs($this->user)->post(route('teacher.supplies.store'), [
            'purpose' => 'Atelier',
            'school_class_id' => $this->other->id,
            'lines' => [['product_id' => $this->flour->id, 'quantity' => 1]],
        ])->assertSessionHasErrors('school_class_id');

        $this->assertDatabaseCount('supply_requests', 0);
    }

    public function test_a_teacher_can_cancel_only_their_own_pending_request(): void
    {
        $mine = SupplyRequest::create(['purpose' => 'Mine', 'requested_by' => $this->user->id]);
        $theirs = SupplyRequest::create(['purpose' => 'Autre', 'requested_by' => User::factory()->create()->id]);

        $this->actingAs($this->user)->delete(route('teacher.supplies.cancel', $theirs))->assertForbidden();
        $this->actingAs($this->user)->delete(route('teacher.supplies.cancel', $mine))->assertSessionHas('success');

        $this->assertDatabaseMissing('supply_requests', ['id' => $mine->id]);
        $this->assertDatabaseHas('supply_requests', ['id' => $theirs->id]);
    }

    public function test_an_approved_request_can_no_longer_be_cancelled(): void
    {
        $approved = SupplyRequest::create(['purpose' => 'Mine', 'requested_by' => $this->user->id, 'status' => 'approuvee']);

        $this->actingAs($this->user)->delete(route('teacher.supplies.cancel', $approved))->assertSessionHasErrors('status');

        $this->assertDatabaseHas('supply_requests', ['id' => $approved->id]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassPromotionTest extends TestCase
{
    use RefreshDatabase;

    private function makeYear(string $label, string $start): AcademicYear
    {
        return AcademicYear::firstOrCreate(
            ['label' => $label],
            ['start_date' => $start, 'end_date' => date('Y-m-d', strtotime($start.' +9 months')), 'is_current' => false]
        );
    }

    private function makeClass(string $name, Formation $formation, AcademicYear $year, ?int $nextClassId = null): SchoolClass
    {
        return SchoolClass::create([
            'name' => $name,
            'formation_id' => $formation->id,
            'academic_year_id' => $year->id,
            'next_class_id' => $nextClassId,
        ]);
    }

    private function makeStudent(SchoolClass $class, string $status = 'actif'): Student
    {
        return Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Test',
            'last_name' => 'Promotion',
            'formation_id' => $class->formation_id,
            'school_class_id' => $class->id,
            'academic_year_id' => $class->academic_year_id,
            'status' => $status,
        ]);
    }

    public function test_admin_with_permission_can_promote_a_student(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $yearN = $this->makeYear('2026-2027', '2026-09-01');
        $yearN1 = $this->makeYear('2027-2028', '2027-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $yearN);
        $targetClass = $this->makeClass('BTS2', $formation, $yearN1);
        $student = $this->makeStudent($sourceClass);

        $response = $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'promote', 'target_class_id' => $targetClass->id],
            ],
        ]);

        $response->assertRedirect();
        $student->refresh();
        $this->assertSame($targetClass->id, $student->school_class_id);
        $this->assertSame($yearN1->id, $student->academic_year_id);
        $this->assertFalse($student->is_repeating);
    }

    public function test_stay_action_marks_student_as_repeating_in_the_target_class(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $yearN = $this->makeYear('2026-2027', '2026-09-01');
        $yearN1 = $this->makeYear('2027-2028', '2027-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $yearN);
        $repeatClass = $this->makeClass('BTS1-bis', $formation, $yearN1);
        $student = $this->makeStudent($sourceClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'stay', 'target_class_id' => $repeatClass->id],
            ],
        ]);

        $student->refresh();
        $this->assertSame($repeatClass->id, $student->school_class_id);
        $this->assertTrue($student->is_repeating);
    }

    public function test_abandon_action_sets_status_without_changing_class(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $year);
        $student = $this->makeStudent($sourceClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'abandon'],
            ],
        ]);

        $student->refresh();
        $this->assertSame('abandon', $student->status);
        $this->assertSame($sourceClass->id, $student->school_class_id);
    }

    public function test_promoting_without_a_target_class_fails_and_rolls_back(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $year);
        $studentOk = $this->makeStudent($sourceClass);
        $studentMissing = $this->makeStudent($sourceClass);

        $response = $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $studentOk->id, 'action' => 'abandon'],
                ['student_id' => $studentMissing->id, 'action' => 'promote', 'target_class_id' => null],
            ],
        ]);

        $response->assertStatus(422);
        // La transaction doit être annulée — la première ligne (valide) ne doit PAS non plus avoir été
        // appliquée.
        $studentOk->refresh();
        $this->assertSame('actif', $studentOk->status);
    }

    public function test_user_without_permission_cannot_run_a_promotion(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier'); // pas de permission eleves

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $year);
        $student = $this->makeStudent($sourceClass);

        $response = $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'abandon'],
            ],
        ]);

        $response->assertForbidden();
        $student->refresh();
        $this->assertSame('actif', $student->status);
    }

    public function test_index_computes_the_most_recent_decision_for_the_academic_year(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $yearN1 = $this->makeYear('2027-2028', '2027-09-01');
        $targetClass = $this->makeClass('BTS2', $formation, $yearN1);
        $sourceClass = $this->makeClass('BTS1', $formation, $year, $targetClass->id);
        $student = $this->makeStudent($sourceClass);

        ReportCard::create([
            'student_id' => $student->id, 'school_class_id' => $sourceClass->id, 'academic_year_id' => $year->id,
            'term' => 'Semestre 1', 'decision' => 'redouble', 'generated_at' => now()->subDay(),
        ]);
        ReportCard::create([
            'student_id' => $student->id, 'school_class_id' => $sourceClass->id, 'academic_year_id' => $year->id,
            'term' => 'Semestre 2', 'decision' => 'admis', 'generated_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('admin.class-promotion.index', ['school_class_id' => $sourceClass->id]));

        $response->assertOk();
        // Vérifie la clé JSON exacte que lit le frontend pour la classe suivante configurée (les relations
        // Eloquent se sérialisent en snake_case, p. ex. « next_class » et non « nextClass ») — une divergence
        // ici casserait silencieusement la valeur « promouvoir » pré-remplie côté client, sans faire échouer
        // une assertion qui ne vérifierait que la valeur de « decision ».
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/ClassPromotion/Index')
            ->where('students.0.decision', 'admis')
            ->where('sourceClass.next_class.id', $targetClass->id)
        );
    }

    public function test_graduate_action_sets_diplome_status_and_generates_diploma_number(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid(), 'diploma_recognition' => "Diplôme d'État"]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $finalClass = $this->makeClass('BTS2', $formation, $year);
        $student = $this->makeStudent($finalClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'graduate'],
            ],
        ]);

        $student->refresh();
        $this->assertSame('diplome', $student->status);
        $this->assertNotNull($student->diploma_number);
    }

    public function test_graduate_action_generates_training_attestation_for_attestation_formations(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'Initiation Pâtisserie', 'code' => 'INIT-'.uniqid(), 'slug' => 'init-'.uniqid(), 'diploma_recognition' => 'Attestation']);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $finalClass = $this->makeClass('Session', $formation, $year);
        $student = $this->makeStudent($finalClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'graduate'],
            ],
        ]);

        $student->refresh();
        $this->assertSame('diplome', $student->status);
        $this->assertNotNull($student->training_attestation_number);
        $this->assertNull($student->diploma_number);
    }

    public function test_exclude_action_sets_exclu_status(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = $this->makeYear('2026-2027', '2026-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $year);
        $student = $this->makeStudent($sourceClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'exclude'],
            ],
        ]);

        $student->refresh();
        $this->assertSame('exclu', $student->status);
    }

    public function test_promote_action_writes_a_student_progression_history_row(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $yearN = $this->makeYear('2026-2027', '2026-09-01');
        $yearN1 = $this->makeYear('2027-2028', '2027-09-01');
        $sourceClass = $this->makeClass('BTS1', $formation, $yearN);
        $targetClass = $this->makeClass('BTS2', $formation, $yearN1);
        $student = $this->makeStudent($sourceClass);

        $this->actingAs($user)->post(route('admin.class-promotion.store'), [
            'assignments' => [
                ['student_id' => $student->id, 'action' => 'promote', 'target_class_id' => $targetClass->id],
            ],
        ]);

        $this->assertDatabaseHas('student_progressions', [
            'student_id' => $student->id,
            'academic_year_id' => $yearN->id,
            'decision' => 'passage',
        ]);
    }
}

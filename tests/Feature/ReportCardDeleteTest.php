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

class ReportCardDeleteTest extends TestCase
{
    use RefreshDatabase;

    private function makeReportCard(): ReportCard
    {
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'status' => 'actif', 'school_class_id' => $class->id, 'academic_year_id' => $year->id,
        ]);

        return ReportCard::create([
            'student_id' => $student->id,
            'school_class_id' => $class->id,
            'academic_year_id' => $year->id,
            'term' => 'Semestre 1',
            'is_published' => false,
        ]);
    }

    public function test_user_with_permission_can_delete_a_report_card(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $reportCard = $this->makeReportCard();

        $response = $this->actingAs($user)->delete(route('admin.report-cards.destroy', $reportCard));

        $response->assertRedirect(route('admin.report-cards.index'));
        $this->assertDatabaseMissing('report_cards', ['id' => $reportCard->id]);
    }

    public function test_user_without_permission_cannot_delete_a_report_card(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier'); // pas de permission bulletins
        $reportCard = $this->makeReportCard();

        $response = $this->actingAs($user)->delete(route('admin.report-cards.destroy', $reportCard));

        $response->assertForbidden();
        $this->assertDatabaseHas('report_cards', ['id' => $reportCard->id]);
    }

    public function test_report_card_can_be_regenerated_after_deletion(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $reportCard = $this->makeReportCard();
        $studentId = $reportCard->student_id;
        $schoolClassId = $reportCard->school_class_id;
        $academicYearId = $reportCard->academic_year_id;

        $this->actingAs($user)->delete(route('admin.report-cards.destroy', $reportCard));

        $response = $this->actingAs($user)->post(route('admin.report-cards.generate'), [
            'school_class_id' => $schoolClassId,
            'academic_year_id' => $academicYearId,
            'term' => 'Semestre 1',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('report_cards', [
            'student_id' => $studentId,
            'academic_year_id' => $academicYearId,
            'term' => 'Semestre 1',
        ]);
    }
}

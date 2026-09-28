<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportCardZipExportTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $schoolClass;
    private AcademicYear $academicYear;
    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->academicYear = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->schoolClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $this->academicYear->id]);

        Permission::create(['name' => 'voir_bulletins', 'guard_name' => 'web']);
        $role = Role::create(['name' => 'staff-test', 'guard_name' => 'web']);
        $role->givePermissionTo('voir_bulletins');

        $this->staff = User::factory()->create();
        $this->staff->assignRole('staff-test');
    }

    private function makePublishedReportCard(string $matricule): ReportCard
    {
        $student = Student::create([
            'matricule' => $matricule, 'first_name' => 'Awa', 'last_name' => 'Test',
            'status' => 'actif', 'school_class_id' => $this->schoolClass->id, 'academic_year_id' => $this->academicYear->id,
        ]);

        return ReportCard::create([
            'student_id' => $student->id,
            'school_class_id' => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'term' => 'Semestre 1',
            'is_published' => true,
        ]);
    }

    public function test_exports_a_zip_containing_one_pdf_per_published_report_card(): void
    {
        $this->makePublishedReportCard('ELV-0001');
        $this->makePublishedReportCard('ELV-0002');

        $response = $this->actingAs($this->staff)->get(route('admin.report-cards.export-zip', [
            'school_class_id' => $this->schoolClass->id,
            'term' => 'Semestre 1',
        ]));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');

        $path = $response->getFile()->getPathname();
        $zip = new \ZipArchive;
        $zip->open($path);
        $this->assertSame(2, $zip->numFiles);
        $zip->close();
    }

    public function test_unpublished_report_cards_are_excluded_from_the_zip(): void
    {
        $card = $this->makePublishedReportCard('ELV-0003');
        $card->update(['is_published' => false]);

        $response = $this->actingAs($this->staff)->get(route('admin.report-cards.export-zip', [
            'school_class_id' => $this->schoolClass->id,
            'term' => 'Semestre 1',
        ]));

        $response->assertStatus(404);
    }

    public function test_returns_404_when_no_report_cards_match_the_filters(): void
    {
        $response = $this->actingAs($this->staff)->get(route('admin.report-cards.export-zip', [
            'school_class_id' => $this->schoolClass->id,
            'term' => 'Semestre 2',
        ]));

        $response->assertStatus(404);
    }

    public function test_requires_both_school_class_id_and_term(): void
    {
        $response = $this->actingAs($this->staff)->get(route('admin.report-cards.export-zip', [
            'school_class_id' => $this->schoolClass->id,
        ]));

        $response->assertStatus(302); // validation redirect (missing 'term')
    }
}

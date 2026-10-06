<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * La page publique de vérification d'un bulletin (QR code) lit la classe et l'année académique dans la charge
 * Inertia : Laravel les sérialise en snake_case (school_class, academic_year). Cette page lisait `schoolClass` et
 * `academicYear` et affichait donc ces deux lignes vides.
 */
class ReportCardVerificationPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_verification_payload_exposes_class_and_academic_year_in_snake_case(): void
    {
        $this->withoutVite();

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $student = Student::create(['matricule' => 'T-1', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif', 'school_class_id' => $class->id]);

        $reportCard = ReportCard::create([
            'student_id' => $student->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id,
            'term' => 'Semestre 1', 'average' => 14.5, 'decision' => 'admis', 'is_published' => true,
        ]);

        $this->get(route('bulletins.verify', $reportCard->qr_token))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/BulletinVerification')
            ->where('reportCard.school_class.name', 'BTS1')
            ->where('reportCard.academic_year.label', '2026-2027')
            ->where('reportCard.student.matricule', 'T-1'));
    }
}

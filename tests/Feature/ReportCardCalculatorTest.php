<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Services\ReportCardCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verrouille un vrai bug : computeDetailedForStudent() déduisait auparavant sa liste de « camarades pour le
 * classement » de l'effectif *actuel* de la classe (SchoolClass::students(), filtré sur school_class_id +
 * status=actif), ce qui excluait silencieusement l'élève ciblé lui-même dès que son school_class_id changeait
 * (promotion ou transfert) — produisant une liste de matières vide pour un bulletin qui a pourtant
 * légitimement des notes. Voir ClassPromotionController pour la fonctionnalité qui l'a révélé.
 */
class ReportCardCalculatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_students_grades_still_appear_on_their_old_bulletin_after_being_promoted_to_a_new_class(): void
    {
        $yearN = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => false]);
        $yearN1 = AcademicYear::create(['label' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $oldClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $yearN->id]);
        $newClass = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $formation->id, 'academic_year_id' => $yearN1->id]);
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id, 'coefficient' => 1]);

        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'formation_id' => $formation->id, 'school_class_id' => $oldClass->id, 'academic_year_id' => $yearN->id,
            'status' => 'actif',
        ]);

        $exam = Exam::create([
            'title' => 'Composition', 'type' => 'examen', 'school_class_id' => $oldClass->id,
            'academic_year_id' => $yearN->id, 'subject_id' => $subject->id, 'term' => 'Semestre 1', 'exam_date' => now()->subYear(),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => true,
        ]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 15, 'is_absent' => false]);

        // Fait passer l'élève hors de l'ancienne classe — c'est ce qui cassait le bulletin de l'ancienne
        // classe avant le correctif.
        $student->update(['school_class_id' => $newClass->id, 'academic_year_id' => $yearN1->id]);

        $detail = app(ReportCardCalculator::class)->computeDetailedForStudent($student, $oldClass->id, $yearN->id, 'Semestre 1');

        $this->assertNotEmpty($detail['subjects'], 'The subject grade must still appear on the old class bulletin after promotion.');
        $this->assertSame('Cuisine', $detail['subjects'][0]['subject']);
        $this->assertSame(15.0, $detail['subjects'][0]['moy20']);
        $this->assertNotNull($detail['overall']);
    }

    public function test_ranking_still_works_among_classmates_who_have_also_since_moved_classes(): void
    {
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $oldClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $otherClass = SchoolClass::create(['name' => 'BTS1-bis', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id, 'coefficient' => 1]);

        $top = Student::create(['matricule' => 'ELV-'.uniqid(), 'first_name' => 'Top', 'last_name' => 'Student', 'formation_id' => $formation->id, 'school_class_id' => $oldClass->id, 'academic_year_id' => $year->id, 'status' => 'actif']);
        $second = Student::create(['matricule' => 'ELV-'.uniqid(), 'first_name' => 'Second', 'last_name' => 'Student', 'formation_id' => $formation->id, 'school_class_id' => $oldClass->id, 'academic_year_id' => $year->id, 'status' => 'actif']);

        $exam = Exam::create(['title' => 'Composition', 'type' => 'examen', 'school_class_id' => $oldClass->id, 'academic_year_id' => $year->id, 'subject_id' => $subject->id, 'term' => 'Semestre 1', 'exam_date' => now(), 'max_score' => 20, 'coefficient' => 1, 'is_published' => true]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $top->id, 'score' => 18, 'is_absent' => false]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $second->id, 'score' => 12, 'is_absent' => false]);

        // $second passe dans une autre classe avant que le bulletin ne soit revu.
        $second->update(['school_class_id' => $otherClass->id]);

        $detail = app(ReportCardCalculator::class)->computeDetailedForStudent($top, $oldClass->id, $year->id, 'Semestre 1');

        $this->assertSame(1, $detail['subjects'][0]['rank']);
        $this->assertSame(2, $detail['subjects'][0]['class_size']);
    }
}

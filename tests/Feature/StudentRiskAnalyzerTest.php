<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Services\StudentRiskAnalyzer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verrouille les règles de calcul du score derrière le tableau de bord « Élèves à risque » et l'e-mail de
 * synthèse hebdomadaire — de mauvais seuils cachent un élève en difficulté ou inondent le personnel de faux
 * positifs.
 */
class StudentRiskAnalyzerTest extends TestCase
{
    use RefreshDatabase;

    private Formation $formation;

    private SchoolClass $schoolClass;

    private Subject $subject;

    private AcademicYear $academicYear;

    protected function setUp(): void
    {
        parent::setUp();

        $this->academicYear = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->schoolClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->academicYear->id]);
        $this->subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $this->formation->id]);
    }

    private function makeStudent(): Student
    {
        return Student::create([
            'matricule' => 'TEST-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Test',
            'status' => 'actif',
            'formation_id' => $this->formation->id,
            'school_class_id' => $this->schoolClass->id,
        ]);
    }

    private function makePublishedExam(int $maxScore = 20): Exam
    {
        return Exam::create([
            'title' => 'Devoir',
            'type' => 'devoir',
            'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id,
            'term' => 'Semestre 1',
            'exam_date' => now(),
            'max_score' => $maxScore,
            'coefficient' => 1,
            'is_published' => true,
        ]);
    }

    public function test_a_student_with_no_risk_factors_is_not_flagged(): void
    {
        $this->makeStudent();

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_two_unjustified_absences_in_the_last_30_days_score_as_faible_risk(): void
    {
        $student = $this->makeStudent();

        Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays(1), 'status' => 'absent']);
        Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays(2), 'status' => 'absent']);

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        $this->assertNotNull($result);
        $this->assertSame('faible', $result['level']);
        $this->assertSame(2, $result['unjustifiedAbsences30d']);
    }

    public function test_five_or_more_unjustified_absences_score_higher_than_two(): void
    {
        $student = $this->makeStudent();

        for ($i = 1; $i <= 5; $i++) {
            Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays($i), 'status' => 'absent']);
        }

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        $this->assertSame(2, $result['score']);
        $this->assertSame('moyen', $result['level']);
    }

    public function test_absences_outside_the_30_day_window_do_not_count(): void
    {
        $student = $this->makeStudent();

        Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays(45), 'status' => 'absent']);
        Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays(50), 'status' => 'absent']);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_justified_absences_are_never_counted_as_a_risk_factor(): void
    {
        $student = $this->makeStudent();

        for ($i = 1; $i <= 6; $i++) {
            Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays($i), 'status' => 'absence_justifiee']);
        }

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_a_low_average_below_8_flags_the_student(): void
    {
        $student = $this->makeStudent();
        $exam = $this->makePublishedExam(20);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 6, 'is_absent' => false]);

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        $this->assertSame(6.0, $result['average']);
        $this->assertSame('moyen', $result['level']); // 2 points rien que pour la moyenne <8
    }

    public function test_an_average_of_exactly_10_is_not_flagged_as_low(): void
    {
        $student = $this->makeStudent();
        $exam = $this->makePublishedExam(20);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 10, 'is_absent' => false]);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_grades_are_normalized_to_20_regardless_of_the_exam_max_score(): void
    {
        $student = $this->makeStudent();
        $exam = $this->makePublishedExam(10); // noté sur 10, pas sur 20
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 3, 'is_absent' => false]); // 3/10 == 6/20

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        $this->assertSame(6.0, $result['average']);
    }

    public function test_unpublished_exam_grades_are_excluded(): void
    {
        $student = $this->makeStudent();
        $exam = Exam::create([
            'title' => 'Brouillon', 'type' => 'devoir', 'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id, 'term' => 'Semestre 1', 'exam_date' => now(),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => false,
        ]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 2, 'is_absent' => false]);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_an_overdue_unpaid_invoice_flags_the_student(): void
    {
        $student = $this->makeStudent();
        Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 25000, 'discount' => 0, 'due_date' => now()->subDays(10),
        ]);

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        $this->assertSame(1, $result['score']);
        $this->assertEquals(25000.0, $result['overdueBalance']);
    }

    public function test_a_fully_paid_overdue_invoice_is_not_flagged(): void
    {
        $student = $this->makeStudent();
        $invoice = Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 25000, 'discount' => 0, 'due_date' => now()->subDays(10),
        ]);
        $invoice->payments()->create(['amount' => 25000, 'method' => 'especes', 'paid_at' => now()]);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_an_invoice_not_yet_due_is_not_flagged(): void
    {
        $student = $this->makeStudent();
        Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 25000, 'discount' => 0, 'due_date' => now()->addDays(10),
        ]);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }

    public function test_multiple_risk_factors_combine_into_a_higher_score_and_level(): void
    {
        $student = $this->makeStudent();

        for ($i = 1; $i <= 5; $i++) {
            Attendance::create(['student_id' => $student->id, 'school_class_id' => $this->schoolClass->id, 'date' => now()->subDays($i), 'status' => 'absent']);
        }
        $exam = $this->makePublishedExam(20);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 5, 'is_absent' => false]);
        Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 150000, 'discount' => 0, 'due_date' => now()->subDays(5),
        ]);

        $result = app(StudentRiskAnalyzer::class)->analyze()->firstWhere('id', $student->id);

        // 2 (absences) + 2 (moyenne <8) + 2 (impayés >100k) = 6
        $this->assertSame(6, $result['score']);
        $this->assertSame('eleve', $result['level']);
        $this->assertCount(3, $result['reasons']);
    }

    public function test_inactive_students_are_never_included_even_with_risk_factors(): void
    {
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Ancien', 'last_name' => 'Eleve',
            'status' => 'abandon', 'formation_id' => $this->formation->id, 'school_class_id' => $this->schoolClass->id,
        ]);
        Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité',
            'amount' => 200000, 'discount' => 0, 'due_date' => now()->subDays(30),
        ]);

        $results = app(StudentRiskAnalyzer::class)->analyze();

        $this->assertCount(0, $results);
    }
}

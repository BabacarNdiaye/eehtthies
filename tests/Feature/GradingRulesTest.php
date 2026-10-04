<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\Grade;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Services\ReportCardCalculator;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Règles de calcul du bulletin :
 *  1. toutes les matières de la classe figurent au bulletin (on part des matières, pas des notes) ;
 *  2. une note manquante dépend du statut : présent = comptée ; absence non justifiée = 0 qui compte ;
 *     absence justifiée = évaluation ignorée ; aucune note sans justification = moyenne de la matière à 0 ;
 *  3. moyenne du semestre = Σ(moyenne matière × coefficient) ÷ Σ(coefficients) ;
 *  4. passage : moyenne annuelle = (semestre 1 + semestre 2) ÷ 2, comparée au seuil (10/20 en général).
 */
class GradingRulesTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private Formation $formation;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    private function subject(string $name, float $coefficient = 1, bool $ofFormation = true): Subject
    {
        return Subject::create(['name' => $name, 'coefficient' => $coefficient, 'formation_id' => $ofFormation ? $this->formation->id : null]);
    }

    private function student(string $first = 'Awa'): Student
    {
        return Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => 'Test',
            'formation_id' => $this->formation->id, 'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
    }

    /** Épreuve publiée du semestre 1, notée sur 20 avec le coefficient 1, sauf indication contraire. */
    private function exam(Subject $subject, string $type = 'devoir', array $attributes = []): Exam
    {
        return Exam::create(array_merge([
            'title' => ucfirst($type), 'type' => $type, 'school_class_id' => $this->class->id, 'subject_id' => $subject->id,
            'academic_year_id' => $this->year->id, 'term' => 'Semestre 1', 'exam_date' => now(),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => true,
        ], $attributes));
    }

    private function grade(Exam $exam, Student $student, ?float $score, string $status = 'present'): Grade
    {
        return Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => $score, 'status' => $status]);
    }

    private function detail(Student $student, string $term = 'Semestre 1'): array
    {
        return app(ReportCardCalculator::class)->computeDetailedForStudent($student, $this->class->id, $this->year->id, $term);
    }

    private function row(array $detail, Subject $subject): array
    {
        $row = collect($detail['subjects'])->firstWhere('subject_id', $subject->id);
        $this->assertNotNull($row, "La matière « {$subject->name} » devrait figurer au bulletin.");

        return $row;
    }

    // ── 1. Toutes les matières de la classe ──────────────────────────────────────────────────────────────

    public function test_every_subject_of_the_class_is_on_the_bulletin_even_without_any_evaluation(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine', 2);
        $gestion = $this->subject('Gestion', 1); // aucune épreuve cette période
        $this->grade($this->exam($cuisine), $student, 14);

        $detail = $this->detail($student);

        $this->assertSame(['Cuisine', 'Gestion'], collect($detail['subjects'])->pluck('subject')->all());

        $row = $this->row($detail, $gestion);
        $this->assertSame('no_evaluation', $row['status']);
        $this->assertFalse($row['evaluated']);
        $this->assertNull($row['moy20']);
        $this->assertNull($row['moyx']);
        $this->assertNull($row['appreciation']);
        $this->assertNull($row['rank']);

        // La matière sans évaluation ne pèse pas dans la moyenne générale (rien à lui reprocher).
        $this->assertSame(14.0, $detail['overall']);
    }

    public function test_subjects_scheduled_in_the_timetable_or_assessed_outside_the_formation_also_appear(): void
    {
        $student = $this->student();
        $own = $this->subject('Cuisine');
        $scheduled = $this->subject('Sport', 1, false);
        $assessed = $this->subject('Anglais', 1, false);
        TimetableEntry::create(['school_class_id' => $this->class->id, 'subject_id' => $scheduled->id, 'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '09:00']);
        $this->grade($this->exam($assessed), $student, 12);

        $names = collect($this->detail($student)['subjects'])->pluck('subject')->all();

        $this->assertSame(['Anglais', 'Cuisine', 'Sport'], $names);
        $this->assertNotNull($own->id);
    }

    public function test_a_subject_of_another_formation_that_is_not_scheduled_nor_assessed_stays_off(): void
    {
        $student = $this->student();
        $this->subject('Cuisine');
        $other = Formation::create(['name' => 'CAP Service', 'code' => 'CAP-'.uniqid(), 'slug' => 'cap-'.uniqid()]);
        Subject::create(['name' => 'Service en salle', 'coefficient' => 1, 'formation_id' => $other->id]);

        $this->assertSame(['Cuisine'], collect($this->detail($student)['subjects'])->pluck('subject')->all());
    }

    // ── 2. Note manquante ────────────────────────────────────────────────────────────────────────────────

    public function test_a_student_with_no_grade_in_an_assessed_subject_gets_zero_for_the_subject(): void
    {
        $other = $this->student('Fatou');
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $devoir = $this->exam($cuisine, 'devoir');
        $composition = $this->exam($cuisine, 'examen');
        $this->grade($devoir, $other, 14);
        $this->grade($composition, $other, 12);

        $row = $this->row($this->detail($student), $cuisine);

        $this->assertSame('evaluated', $row['status']);
        $this->assertSame(0.0, $row['devoir']);
        $this->assertSame(0.0, $row['composition']);
        $this->assertSame(0.0, $row['moy20']);
        $this->assertSame('Très Faible', $row['appreciation']);
    }

    public function test_a_blank_grade_sheet_line_counts_as_a_missing_grade(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine), $student, null); // ligne enregistrée sans note ni absence

        $this->assertSame(0.0, $this->row($this->detail($student), $cuisine)['moy20']);
    }

    public function test_an_unjustified_absence_counts_as_a_zero_in_the_average(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'Devoir 1']), $student, 16);
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'Devoir 2']), $student, null, 'absent_non_justifie');

        $row = $this->row($this->detail($student), $cuisine);

        $this->assertSame(8.0, $row['devoir']); // (16 + 0) ÷ 2
        $this->assertSame(8.0, $row['moy20']);
    }

    public function test_a_justified_absence_is_left_out_of_the_average(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'Devoir 1']), $student, 16);
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'Devoir 2']), $student, null, 'absent_justifie');

        $row = $this->row($this->detail($student), $cuisine);

        $this->assertSame(16.0, $row['devoir']); // la moyenne se fait sur les notes qu'il a
        $this->assertSame(16.0, $row['moy20']);
    }

    public function test_a_subject_justified_on_every_evaluation_is_not_evaluated_and_does_not_drag_the_general_average(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine', 1);
        $gestion = $this->subject('Gestion', 3);
        $this->grade($this->exam($cuisine), $student, 12);
        $this->grade($this->exam($gestion, 'devoir'), $student, null, 'absent_justifie');
        $this->grade($this->exam($gestion, 'examen'), $student, null, 'absent_justifie');

        $detail = $this->detail($student);
        $row = $this->row($detail, $gestion);

        $this->assertSame('absence_justifiee', $row['status']);
        $this->assertFalse($row['evaluated']);
        $this->assertNull($row['moy20']);
        $this->assertNull($row['appreciation']);
        $this->assertSame(12.0, $detail['overall']); // et non 3 : la matière est retirée du calcul
    }

    public function test_the_general_average_is_null_when_nothing_could_be_evaluated(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine), $student, null, 'absent_justifie');

        $this->assertNull($this->detail($student)['overall']);

        $results = app(ReportCardCalculator::class)->computeForClass($this->class, $this->year->id, 'Semestre 1');
        $this->assertNull($results[0]['average']);
        $this->assertNull($results[0]['rank']);
    }

    // ── 3. Moyenne du semestre ───────────────────────────────────────────────────────────────────────────

    public function test_the_semester_average_is_the_coefficient_weighted_mean_of_the_subject_averages(): void
    {
        $student = $this->student();
        $a = $this->subject('Anglais', 2);
        $b = $this->subject('Cuisine', 3);
        $this->subject('Gestion', 5); // sans évaluation : hors moyenne
        $this->grade($this->exam($a), $student, 10);
        $this->grade($this->exam($b), $student, 16);

        $detail = $this->detail($student);

        $this->assertSame(20.0, $this->row($detail, $a)['moyx']);
        $this->assertSame(48.0, $this->row($detail, $b)['moyx']);
        $this->assertSame(13.6, $detail['overall']); // (10×2 + 16×3) ÷ (2 + 3)
    }

    public function test_devoirs_and_composition_weigh_the_same_inside_a_subject(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'D1']), $student, 10);
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'D2']), $student, 14);
        $this->grade($this->exam($cuisine, 'examen'), $student, 18);

        $row = $this->row($this->detail($student), $cuisine);

        $this->assertSame(12.0, $row['devoir']);
        $this->assertSame(18.0, $row['composition']);
        $this->assertSame(15.0, $row['moy20']); // (moyenne des devoirs + composition) ÷ 2
    }

    public function test_exam_coefficients_weigh_the_grades_inside_a_category(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'D1', 'coefficient' => 1]), $student, 10);
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'D2', 'coefficient' => 3]), $student, 14);

        $this->assertSame(13.0, $this->row($this->detail($student), $cuisine)['devoir']); // (10×1 + 14×3) ÷ 4
    }

    public function test_grades_are_brought_back_to_twenty(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['max_score' => 10]), $student, 7);

        $this->assertSame(14.0, $this->row($this->detail($student), $cuisine)['moy20']);
    }

    public function test_make_up_session_exams_are_optional_and_never_filled_with_zero(): void
    {
        $took = $this->student('Awa');
        $skipped = $this->student('Fatou');
        $skippedAndAbsent = $this->student('Moussa');
        $cuisine = $this->subject('Cuisine');
        $normal = $this->exam($cuisine, 'examen', ['title' => 'Composition']);
        $makeUp = $this->exam($cuisine, 'examen', ['title' => 'Composition (rattrapage)', 'session' => 'rattrapage']);
        foreach ([$took, $skipped, $skippedAndAbsent] as $student) {
            $this->grade($normal, $student, 14);
        }
        $this->grade($makeUp, $took, 16);
        $this->grade($makeUp, $skippedAndAbsent, null, 'absent_non_justifie');

        $this->assertSame(15.0, $this->row($this->detail($took), $cuisine)['composition']);            // (14 + 16) ÷ 2
        $this->assertSame(14.0, $this->row($this->detail($skipped), $cuisine)['composition']);         // pas de 0 : épreuve facultative
        $this->assertSame(14.0, $this->row($this->detail($skippedAndAbsent), $cuisine)['composition']); // absent au rattrapage : rien
    }

    public function test_exams_that_are_not_published_do_not_count(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['title' => 'Publié']), $student, 12);
        $this->exam($cuisine, 'devoir', ['title' => 'Brouillon', 'is_published' => false]); // personne n'a de note : pas de 0

        $this->assertSame(12.0, $this->row($this->detail($student), $cuisine)['moy20']);

        $draftOnly = $this->subject('Gestion');
        $this->exam($draftOnly, 'devoir', ['is_published' => false]);
        $this->assertSame('no_evaluation', $this->row($this->detail($student), $draftOnly)['status']);
    }

    public function test_exams_of_another_semester_do_not_count_in_this_one(): void
    {
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'devoir', ['term' => 'Semestre 1']), $student, 12);
        $this->exam($cuisine, 'devoir', ['term' => 'Semestre 2']); // pas de note pour lui, mais c'est l'autre semestre

        $this->assertSame(12.0, $this->row($this->detail($student, 'Semestre 1'), $cuisine)['moy20']);
        $this->assertSame(0.0, $this->row($this->detail($student, 'Semestre 2'), $cuisine)['moy20']);
    }

    // ── Classement ───────────────────────────────────────────────────────────────────────────────────────

    public function test_a_student_without_any_grade_is_ranked_last_and_counted_in_the_class(): void
    {
        $top = $this->student('Awa');
        $second = $this->student('Fatou');
        $absent = $this->student('Moussa');
        $cuisine = $this->subject('Cuisine');
        $exam = $this->exam($cuisine, 'examen');
        $this->grade($exam, $top, 18);
        $this->grade($exam, $second, 12);

        $row = $this->row($this->detail($absent), $cuisine);

        $this->assertSame(0.0, $row['moy20']);
        $this->assertSame(3, $row['rank']);
        $this->assertSame(3, $row['class_size']);
        $this->assertSame(2, $this->row($this->detail($second), $cuisine)['rank']);
    }

    public function test_class_generation_gives_a_zero_average_to_a_student_without_grades(): void
    {
        $graded = $this->student('Awa');
        $nothing = $this->student('Moussa');
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'examen'), $graded, 12);

        $results = collect(app(ReportCardCalculator::class)->computeForClass($this->class, $this->year->id, 'Semestre 1'))
            ->keyBy(fn ($result) => $result['student']->id);

        $this->assertSame(12.0, $results[$graded->id]['average']);
        $this->assertSame(1, $results[$graded->id]['rank']);
        $this->assertSame(0.0, $results[$nothing->id]['average']);
        $this->assertSame(2, $results[$nothing->id]['rank']);
        $this->assertSame(6.0, $results[$nothing->id]['class_average']);
    }

    // ── 4. Passage en classe supérieure ──────────────────────────────────────────────────────────────────

    private function generateBulletins(User $admin, string $term): void
    {
        $this->actingAs($admin)->post(route('admin.report-cards.generate'), [
            'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id, 'term' => $term,
        ])->assertRedirect();
    }

    private function admin(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        return $admin;
    }

    public function test_the_final_semester_decision_follows_the_annual_average(): void
    {
        $admin = $this->admin();
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 1']), $student, 16);
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 2']), $student, 6);

        $this->generateBulletins($admin, 'Semestre 1');
        $this->generateBulletins($admin, 'Semestre 2');

        $second = ReportCard::where('term', 'Semestre 2')->firstOrFail();
        $this->assertEquals(11.0, (float) $second->annual_average); // (16 + 6) ÷ 2
        $this->assertEquals(6.0, (float) $second->average);
        // 6 seul ne passerait pas ; la moyenne annuelle, 11, atteint le seuil de 10.
        $this->assertSame('admis', $second->decision);
    }

    public function test_the_pass_threshold_is_the_one_of_the_level_when_it_is_set(): void
    {
        $admin = $this->admin();
        $level = FormationLevel::create(['formation_id' => $this->formation->id, 'level_number' => 1, 'label' => 'Année 1', 'min_average' => 12]);
        $this->class->update(['formation_level_id' => $level->id]);
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 1']), $student, 16);
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 2']), $student, 6);

        $this->generateBulletins($admin, 'Semestre 1');
        $this->generateBulletins($admin, 'Semestre 2');

        $this->assertSame('admis', ReportCard::where('term', 'Semestre 1')->firstOrFail()->decision); // 16 ≥ 12
        $this->assertSame('redouble', ReportCard::where('term', 'Semestre 2')->firstOrFail()->decision); // annuelle 11 < 12
    }

    public function test_the_decision_defaults_to_ten_out_of_twenty_without_a_level_threshold(): void
    {
        $admin = $this->admin();
        $student = $this->student();
        $cuisine = $this->subject('Cuisine');
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 1']), $student, 9);
        $this->grade($this->exam($cuisine, 'examen', ['term' => 'Semestre 2']), $student, 10);

        $this->generateBulletins($admin, 'Semestre 1');
        $this->generateBulletins($admin, 'Semestre 2');

        $this->assertSame('redouble', ReportCard::where('term', 'Semestre 1')->firstOrFail()->decision);
        $second = ReportCard::where('term', 'Semestre 2')->firstOrFail();
        $this->assertEquals(9.5, (float) $second->annual_average);
        $this->assertSame('redouble', $second->decision); // 9,5 < 10
    }

    public function test_the_bulletin_page_lists_every_subject_with_its_state(): void
    {
        $admin = $this->admin();
        $student = $this->student();
        $cuisine = $this->subject('Cuisine', 2);
        $gestion = $this->subject('Gestion', 1);
        $this->subject('Tourisme', 1); // aucune épreuve
        $this->grade($this->exam($cuisine, 'examen'), $student, 14);
        $this->grade($this->exam($gestion, 'examen'), $student, null, 'absent_justifie');

        $this->generateBulletins($admin, 'Semestre 1');
        $reportCard = ReportCard::firstOrFail();

        $this->actingAs($admin)->get(route('admin.report-cards.show', $reportCard))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ReportCards/Show')
            ->has('subjects', 3)
            ->where('subjects.0.subject', 'Cuisine')
            ->where('subjects.0.status', 'evaluated')
            ->where('subjects.0.evaluated', true)
            ->where('subjects.1.subject', 'Gestion')
            ->where('subjects.1.status', 'absence_justifiee')
            ->where('subjects.1.evaluated', false)
            ->where('subjects.2.subject', 'Tourisme')
            ->where('subjects.2.status', 'no_evaluation')
            ->where('subjects.2.moy20', null)
        );
        $this->assertEquals(14.0, (float) $reportCard->average);
    }

    public function test_the_bulletin_pdf_says_why_a_subject_is_not_evaluated_and_leaves_it_out_of_the_totals(): void
    {
        $admin = $this->admin();
        $student = $this->student();
        $cuisine = $this->subject('Cuisine', 2);
        $gestion = $this->subject('Gestion', 3);
        $this->subject('Tourisme', 5);
        $this->grade($this->exam($cuisine, 'examen'), $student, 14);
        $this->grade($this->exam($gestion, 'examen'), $student, null, 'absent_justifie');
        $this->generateBulletins($admin, 'Semestre 1');
        $reportCard = ReportCard::with('student', 'schoolClass.formation', 'academicYear')->firstOrFail();

        $html = view('pdf.bulletin', [
            'reportCard' => $reportCard,
            'subjects' => $this->detail($student)['subjects'],
            'qrCode' => '',
        ])->render();

        $this->assertSame(2, substr_count($html, 'Non évalué'));
        $this->assertStringContainsString('Absence justifiée', $html);
        $this->assertStringContainsString('Aucune épreuve', $html);
        // Le total ne porte que sur la matière évaluée : coefficient 2, 14 × 2 = 28.
        $this->assertStringContainsString('TOTAL : 28.00', $html);
    }

    // ── Saisie des statuts ───────────────────────────────────────────────────────────────────────────────

    public function test_the_grade_model_keeps_is_absent_and_score_in_line_with_the_status(): void
    {
        $cuisine = $this->subject('Cuisine');
        $exam = $this->exam($cuisine);

        $justified = Grade::create(['exam_id' => $exam->id, 'student_id' => $this->student()->id, 'score' => 12, 'status' => 'absent_justifie']);
        $this->assertTrue($justified->fresh()->is_absent);
        $this->assertNull($justified->fresh()->score);

        $legacyAbsent = Grade::create(['exam_id' => $exam->id, 'student_id' => $this->student()->id, 'is_absent' => true]);
        $this->assertSame('absent_non_justifie', $legacyAbsent->fresh()->status);

        $present = Grade::create(['exam_id' => $exam->id, 'student_id' => $this->student()->id, 'score' => 10, 'is_absent' => false]);
        $this->assertSame('present', $present->fresh()->status);
        $this->assertFalse($present->fresh()->is_absent);

        // Un ancien écrivain qui décoche « absent » ramène l'élève à « présent ».
        $legacyAbsent->update(['is_absent' => false, 'score' => 8]);
        $this->assertSame('present', $legacyAbsent->fresh()->status);
        $this->assertEquals(8, $legacyAbsent->fresh()->score);
    }

    public function test_the_admin_grade_sheet_stores_the_three_statuses(): void
    {
        $admin = $this->admin();
        $present = $this->student('Awa');
        $justified = $this->student('Fatou');
        $unjustified = $this->student('Moussa');
        $legacy = $this->student('Ibou');
        $exam = $this->exam($this->subject('Cuisine'));

        $this->actingAs($admin)->post(route('admin.exams.grades.store', $exam), ['grades' => [
            ['student_id' => $present->id, 'score' => 13.5, 'status' => 'present'],
            ['student_id' => $justified->id, 'score' => 15, 'status' => 'absent_justifie'],
            ['student_id' => $unjustified->id, 'score' => null, 'status' => 'absent_non_justifie'],
            ['student_id' => $legacy->id, 'is_absent' => true], // ancien format : une case « absent » cochée
        ]])->assertRedirect();

        $this->assertEquals(13.5, Grade::where('student_id', $present->id)->value('score'));
        $this->assertSame('present', Grade::where('student_id', $present->id)->value('status'));
        $this->assertSame('absent_justifie', Grade::where('student_id', $justified->id)->value('status'));
        $this->assertNull(Grade::where('student_id', $justified->id)->value('score')); // pas de note avec une absence
        $this->assertSame('absent_non_justifie', Grade::where('student_id', $unjustified->id)->value('status'));
        $this->assertSame('absent_non_justifie', Grade::where('student_id', $legacy->id)->value('status'));
    }

    public function test_the_grade_sheet_refuses_an_unknown_status(): void
    {
        $admin = $this->admin();
        $student = $this->student();
        $exam = $this->exam($this->subject('Cuisine'));

        $this->actingAs($admin)->post(route('admin.exams.grades.store', $exam), ['grades' => [
            ['student_id' => $student->id, 'score' => 10, 'status' => 'malade'],
        ]])->assertSessionHasErrors('grades.0.status');

        $this->assertSame(0, Grade::count());
    }

    public function test_a_teacher_records_the_statuses_for_their_own_class_and_subject(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        $teacher = Teacher::create(['user_id' => $user->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Ousmane', 'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe']);
        $cuisine = $this->subject('Cuisine');
        TimetableEntry::create(['school_class_id' => $this->class->id, 'subject_id' => $cuisine->id, 'teacher_id' => $teacher->id, 'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '09:00']);
        $exam = $this->exam($cuisine, 'devoir', ['created_by' => $user->id]);
        $present = $this->student('Awa');
        $justified = $this->student('Fatou');
        $unjustified = $this->student('Moussa');

        $this->actingAs($user)->post(route('teacher.exams.grades.store', $exam), ['grades' => [
            ['student_id' => $present->id, 'score' => 11, 'status' => 'present'],
            ['student_id' => $justified->id, 'status' => 'absent_justifie'],
            ['student_id' => $unjustified->id, 'is_absent' => true],
        ]])->assertRedirect();

        $this->assertSame('present', Grade::where('student_id', $present->id)->value('status'));
        $this->assertSame('absent_justifie', Grade::where('student_id', $justified->id)->value('status'));
        $this->assertSame('absent_non_justifie', Grade::where('student_id', $unjustified->id)->value('status'));
    }

    public function test_publishing_an_exam_warns_about_students_who_will_count_as_zero(): void
    {
        $admin = $this->admin();
        $graded = $this->student('Awa');
        $this->student('Fatou'); // ni note ni statut
        $this->student('Moussa'); // ni note ni statut
        $exam = $this->exam($this->subject('Cuisine'), 'devoir', ['is_published' => false]);
        $this->grade($exam, $graded, 12);

        $response = $this->actingAs($admin)->patch(route('admin.exams.publish', $exam));

        $response->assertSessionHas('success', fn (string $message) => str_contains($message, 'Résultats publiés') && str_contains($message, '2 élèves'));
        $this->assertTrue($exam->fresh()->is_published);

        // Dépublier ne dit rien de tel.
        $this->actingAs($admin)->patch(route('admin.exams.publish', $exam))
            ->assertSessionHas('success', 'Résultats dépubliés.');
    }

    public function test_publishing_an_exam_where_everyone_has_a_grade_or_a_status_has_no_warning(): void
    {
        $admin = $this->admin();
        $one = $this->student('Awa');
        $two = $this->student('Fatou');
        $exam = $this->exam($this->subject('Cuisine'), 'devoir', ['is_published' => false]);
        $this->grade($exam, $one, 12);
        $this->grade($exam, $two, null, 'absent_justifie');

        $this->actingAs($admin)->patch(route('admin.exams.publish', $exam))
            ->assertSessionHas('success', 'Résultats publiés.');
    }
}

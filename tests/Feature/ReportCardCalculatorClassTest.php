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
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Deux ajouts du calculateur pour le conseil de classe, tous deux additifs :
 *  - termDateRange() : la fenêtre de dates d'une période, partagée avec les totaux d'absence du bulletin ;
 *  - computeDetailedForClass() : le détail matière par matière de toute la classe en une seule passe. Il doit donner,
 *    pour chaque élève, exactement ce que computeDetailedForStudent() donne (c'est la preuve qu'on ne recalcule pas
 *    autrement : RG-01 « repris du module Notes, jamais recalculé »).
 */
class ReportCardCalculatorClassTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private Formation $formation;

    private SchoolClass $class;

    private ReportCardCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->calculator = app(ReportCardCalculator::class);
        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    private function student(string $first, ?SchoolClass $class = null): Student
    {
        $class ??= $this->class;

        return Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => 'Test',
            'formation_id' => $this->formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
    }

    private function exam(Subject $subject, string $type, string $term = 'Semestre 1', float $coefficient = 1): Exam
    {
        return Exam::create([
            'title' => ucfirst($type).' '.$subject->name, 'type' => $type, 'school_class_id' => $this->class->id,
            'academic_year_id' => $this->year->id, 'subject_id' => $subject->id, 'term' => $term, 'exam_date' => '2026-11-10',
            'max_score' => 20, 'coefficient' => $coefficient, 'is_published' => true,
        ]);
    }

    private function grade(Exam $exam, Student $student, ?float $score, string $status = Grade::PRESENT): void
    {
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => $score, 'status' => $status]);
    }

    /**
     * Une classe de quatre élèves, deux matières. Moyennes de Cuisine : Awa 15, Moussa 9,5, Fatou 9 (composition en
     * absence non justifiée = 0), « Sans » 0 (aucune note) ; Moussa est justifié en Anglais.
     *
     * @return array{0: Student, 1: Student, 2: Student, 3: Student}
     */
    private function scenario(): array
    {
        $cuisine = Subject::create(['name' => 'Cuisine', 'formation_id' => $this->formation->id, 'coefficient' => 3]);
        $anglais = Subject::create(['name' => 'Anglais', 'formation_id' => $this->formation->id, 'coefficient' => 1]);

        $awa = $this->student('Awa');
        $moussa = $this->student('Moussa');
        $fatou = $this->student('Fatou');
        $nobody = $this->student('Sans');

        $devoirCuisine = $this->exam($cuisine, 'devoir');
        $compoCuisine = $this->exam($cuisine, 'examen', coefficient: 2);
        $devoirAnglais = $this->exam($anglais, 'devoir');

        $this->grade($devoirCuisine, $awa, 16);
        $this->grade($compoCuisine, $awa, 14);
        $this->grade($devoirAnglais, $awa, 9);

        $this->grade($devoirCuisine, $moussa, 11);
        $this->grade($compoCuisine, $moussa, 8);
        $this->grade($devoirAnglais, $moussa, null, Grade::ABSENT_JUSTIFIED);

        $this->grade($devoirCuisine, $fatou, 18);
        $this->grade($compoCuisine, $fatou, null, Grade::ABSENT_UNJUSTIFIED);
        $this->grade($devoirAnglais, $fatou, 15);

        return [$awa, $moussa, $fatou, $nobody];
    }

    public function test_the_class_detail_is_exactly_the_detail_of_each_student(): void
    {
        $students = $this->scenario();

        $detail = $this->calculator->computeDetailedForClass($this->class, $this->year->id, 'Semestre 1');

        foreach ($students as $student) {
            $this->assertArrayHasKey($student->id, $detail, "{$student->first_name} manque.");
            $this->assertEquals(
                $this->calculator->computeDetailedForStudent($student, $this->class->id, $this->year->id, 'Semestre 1'),
                $detail[$student->id],
                "Le détail de {$student->first_name} diffère de celui du bulletin."
            );
        }
    }

    public function test_the_class_detail_keeps_the_rank_and_the_size_of_each_subject(): void
    {
        [$awa, $moussa, $fatou, $nobody] = $this->scenario();

        $detail = $this->calculator->computeDetailedForClass($this->class, $this->year->id, 'Semestre 1');
        $cuisine = fn (Student $student) => collect($detail[$student->id]['subjects'])->firstWhere('subject', 'Cuisine');

        $this->assertSame([1, 2, 3, 4], [$cuisine($awa)['rank'], $cuisine($moussa)['rank'], $cuisine($fatou)['rank'], $cuisine($nobody)['rank']]);
        $this->assertSame(4, $cuisine($awa)['class_size'], "Un élève sans note est classé, il compte dans l'effectif du classement.");
        $this->assertSame(15.0, $cuisine($awa)['moy20']);
        $this->assertSame(9.0, $cuisine($fatou)['moy20']);
        $this->assertNotNull($detail[$awa->id]['overall']);
    }

    public function test_the_class_detail_covers_the_active_students_and_leaves_out_who_moved_or_stopped(): void
    {
        [$awa, $moussa] = $this->scenario();
        $other = SchoolClass::create(['name' => 'BTS1-bis', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $moussa->update(['school_class_id' => $other->id]);
        $inactive = $this->student('Inactive');
        $inactive->update(['status' => 'abandon']);

        $detail = $this->calculator->computeDetailedForClass($this->class, $this->year->id, 'Semestre 1');

        $this->assertArrayHasKey($awa->id, $detail);
        $this->assertArrayNotHasKey($moussa->id, $detail, 'Passé dans une autre classe : il ne fait plus partie des élèves demandés.');
        $this->assertArrayNotHasKey($inactive->id, $detail);

        // Mais il reste dans le classement de ses anciens camarades, comme dans le bulletin.
        $this->assertEquals(
            $this->calculator->computeDetailedForStudent($awa, $this->class->id, $this->year->id, 'Semestre 1'),
            $detail[$awa->id]
        );
    }

    public function test_the_students_to_return_can_be_chosen(): void
    {
        [$awa, $moussa] = $this->scenario();

        $detail = $this->calculator->computeDetailedForClass($this->class, $this->year->id, 'Semestre 1', collect([$awa->id, $moussa->id]));

        $this->assertEqualsCanonicalizing([$awa->id, $moussa->id], array_keys($detail));
    }

    public function test_the_class_detail_does_not_run_one_set_of_queries_per_student(): void
    {
        $this->scenario();
        foreach (range(1, 8) as $i) {
            $this->student("Extra{$i}");
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->calculator->computeDetailedForClass($this->class, $this->year->id, 'Semestre 1');
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(12, $queries, "{$queries} requêtes pour 12 élèves : le détail de la classe ne doit pas se refaire élève par élève.");
    }

    public function test_the_term_windows_share_the_academic_year_without_a_gap(): void
    {
        [$firstFrom, $firstTo] = $this->calculator->termDateRange($this->year, 'Semestre 1');
        [$secondFrom, $secondTo] = $this->calculator->termDateRange($this->year, 'Semestre 2');

        $this->assertSame('2026-09-01', $firstFrom->toDateString());
        $this->assertSame($firstTo->toDateString(), $secondFrom->toDateString());
        $this->assertSame('2027-06-30', $secondTo->toDateString());
        $this->assertTrue($firstFrom->lt($firstTo));
    }

    public function test_an_unknown_term_has_no_window(): void
    {
        $this->assertNull($this->calculator->termDateRange($this->year, 'Trimestre 9'));
    }

    public function test_the_bulletin_attendance_totals_still_use_that_window(): void
    {
        $student = $this->student('Awa');
        [$from, $to] = $this->calculator->termDateRange($this->year, 'Semestre 1');

        foreach ([[$from->copy()->addDay(), 'absent'], [$to->copy()->subDay(), 'retard'], [$to->copy()->addDays(5), 'absent']] as [$date, $status]) {
            DB::table('attendances')->insert([
                'student_id' => $student->id, 'school_class_id' => $this->class->id, 'date' => $date->toDateString(),
                'status' => $status, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $stats = $this->calculator->attendanceStatsForTerm($student, $this->year, 'Semestre 1');

        $this->assertSame(['retard' => 1, 'absence' => 1, 'unjustified' => 1], $stats);
    }
}

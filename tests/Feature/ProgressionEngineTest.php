<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\Grade;
use App\Models\Internship;
use App\Models\Partner;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\Student;
use App\Models\Subject;
use App\Services\ProgressionEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgressionEngineTest extends TestCase
{
    use RefreshDatabase;

    private Formation $formation;

    private AcademicYear $year;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid(), 'diploma_recognition' => "Diplôme d'État"]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    private function makeStudent(): Student
    {
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'formation_id' => $this->formation->id, 'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
        $this->class->refresh();

        return $student;
    }

    private function makeLevel(array $attrs = []): FormationLevel
    {
        $level = FormationLevel::create(array_merge([
            'formation_id' => $this->formation->id,
            'level_number' => 1,
            'label' => 'Année 1',
        ], $attrs));

        $this->class->update(['formation_level_id' => $level->id]);
        $this->class->refresh();

        return $level;
    }

    private function reportCard(Student $student, ?float $average, int $unjustified = 0): void
    {
        ReportCard::create([
            'student_id' => $student->id, 'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'term' => 'Semestre 1', 'average' => $average, 'unjustified_absence_count' => $unjustified, 'generated_at' => now(),
        ]);
    }

    public function test_no_configured_level_returns_undetermined(): void
    {
        $student = $this->makeStudent();

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);

        $this->assertSame('undetermined', $result['action']);
    }

    public function test_average_above_threshold_promotes_to_intermediate_level(): void
    {
        $this->makeLevel(['min_average' => 10]);
        $student = $this->makeStudent();
        $this->reportCard($student, 14.5);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);

        $this->assertSame('promote', $result['action']);
    }

    public function test_average_below_threshold_suggests_stay(): void
    {
        $this->makeLevel(['min_average' => 10]);
        $student = $this->makeStudent();
        $this->reportCard($student, 8);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);

        $this->assertSame('stay', $result['action']);
        $this->assertStringContainsString('Moyenne annuelle insuffisante', $result['reasons'][0]);
    }

    public function test_too_many_unjustified_absences_fails_even_with_good_average(): void
    {
        $this->makeLevel(['min_average' => 10, 'max_unjustified_absences' => 5]);
        $student = $this->makeStudent();
        $this->reportCard($student, 16, 8);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);

        $this->assertSame('stay', $result['action']);
    }

    public function test_required_skill_not_acquired_blocks_promotion(): void
    {
        $level = $this->makeLevel(['min_average' => 10]);
        $skill = Skill::create(['formation_id' => $this->formation->id, 'name' => 'Découpe']);
        $level->requiredSkills()->attach($skill->id);

        $student = $this->makeStudent();
        $this->reportCard($student, 16);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('stay', $result['action']);

        SkillAssessment::create(['student_id' => $student->id, 'skill_id' => $skill->id, 'level' => 3, 'assessed_at' => now()]);
        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('promote', $result['action']);
    }

    public function test_required_internship_not_completed_blocks_promotion(): void
    {
        $this->makeLevel(['min_average' => 10, 'internship_required' => true]);
        $student = $this->makeStudent();
        $this->reportCard($student, 16);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('stay', $result['action']);

        $partner = Partner::create(['name' => 'Hôtel Test', 'type' => 'entreprise']);
        Internship::create([
            'student_id' => $student->id, 'partner_id' => $partner->id, 'title' => 'Stage cuisine', 'status' => 'termine',
            'start_date' => now()->subMonth(), 'end_date' => now(),
        ]);
        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('promote', $result['action']);
    }

    public function test_required_subject_average_below_threshold_blocks_promotion(): void
    {
        $level = $this->makeLevel(['min_average' => 10]);
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $this->formation->id, 'coefficient' => 1]);
        $level->requiredSubjects()->attach($subject->id);
        $student = $this->makeStudent();
        $this->reportCard($student, 16);

        $exam = Exam::create([
            'title' => 'Composition', 'type' => 'examen', 'school_class_id' => $this->class->id,
            'subject_id' => $subject->id, 'term' => 'Semestre 1', 'exam_date' => now(),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => true,
        ]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 6, 'is_absent' => false]);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('stay', $result['action']);
        $this->assertTrue(collect($result['reasons'])->contains(fn ($r) => str_contains($r, 'Matière obligatoire non validée')));
    }

    public function test_final_level_success_graduates_and_failure_is_non_admis(): void
    {
        $this->makeLevel(['min_average' => 10, 'is_final_level' => true]);
        $student = $this->makeStudent();
        $this->reportCard($student, 15);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('graduate', $result['action']);
        $this->assertNull($result['target_class']);
    }

    public function test_final_level_failure_is_fail_final_not_stay(): void
    {
        $this->makeLevel(['min_average' => 10, 'is_final_level' => true]);
        $student = $this->makeStudent();
        $this->reportCard($student, 5);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('fail_final', $result['action']);
    }

    public function test_short_single_level_formation_graduates_directly(): void
    {
        $shortFormation = Formation::create([
            'name' => 'Initiation Pâtisserie', 'code' => 'INIT-'.uniqid(), 'slug' => 'init-'.uniqid(),
            'diploma_recognition' => 'Attestation', 'duration_value' => 3, 'duration_unit' => 'mois',
        ]);
        $shortClass = SchoolClass::create(['name' => 'Session unique', 'formation_id' => $shortFormation->id, 'academic_year_id' => $this->year->id]);
        $level = FormationLevel::create(['formation_id' => $shortFormation->id, 'level_number' => 1, 'label' => 'Session', 'is_final_level' => true, 'min_average' => 10]);
        $shortClass->update(['formation_level_id' => $level->id]);

        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Modou', 'last_name' => 'Test',
            'formation_id' => $shortFormation->id, 'school_class_id' => $shortClass->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
        ReportCard::create([
            'student_id' => $student->id, 'school_class_id' => $shortClass->id, 'academic_year_id' => $this->year->id,
            'term' => 'Semestre 1', 'average' => 12, 'generated_at' => now(),
        ]);

        $result = app(ProgressionEngine::class)->suggest($student, $shortClass);
        $this->assertSame('graduate', $result['action']);
    }

    public function test_promote_target_class_resolves_automatically_via_next_level(): void
    {
        $this->makeLevel(['min_average' => 10]);
        $level2 = FormationLevel::create(['formation_id' => $this->formation->id, 'level_number' => 2, 'label' => 'Année 2', 'is_final_level' => true]);
        $year2 = AcademicYear::create(['label' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_current' => false]);
        $class2 = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $year2->id, 'formation_level_id' => $level2->id]);

        $student = $this->makeStudent();
        $this->reportCard($student, 15);

        $result = app(ProgressionEngine::class)->suggest($student, $this->class);
        $this->assertSame('promote', $result['action']);
        $this->assertSame($class2->id, $result['target_class']?->id);
    }
}

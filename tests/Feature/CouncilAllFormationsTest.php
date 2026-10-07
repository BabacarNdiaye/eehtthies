<?php

namespace Tests\Feature;

use App\Models\AlertThreshold;
use App\Models\Council;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Services\Council\CouncilSittingService;
use App\Services\Council\CouncilWorkflow;
use Database\Seeders\FormationsCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Le conseil de classe sur chaque formation du catalogue : un conseil de fin d'année est mené de la création à la
 * clôture (décision d'orientation comprise) pour une classe de chacune d'elles, y compris les formations courtes.
 */
class CouncilAllFormationsTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->seed(FormationsCatalogSeeder::class);
    }

    public function test_an_end_of_year_council_closes_for_every_formation_of_the_catalog(): void
    {
        $formations = Formation::where('id', '!=', $this->formation->id)->orderBy('id')->get();

        $this->assertGreaterThanOrEqual(16, $formations->count(), 'Le catalogue doit compter toutes les formations.');

        foreach ($formations as $formation) {
            $this->formation = $formation;
            $this->class = SchoolClass::create(['name' => 'Classe '.$formation->code, 'formation_id' => $formation->id, 'academic_year_id' => $this->year->id]);

            $subject = $this->subject('Matière '.$formation->code, 2);
            [$teacherUser] = $this->teacher('Prof'.$formation->id, [$subject]);
            $pupil = $this->pupil('Awa'.$formation->id);
            $this->grade($this->exam($subject), $pupil, 14.0);

            $president = $this->staff('direction');
            $council = $this->openCouncil($president, ['is_end_of_year' => true, 'main_teacher_id' => $teacherUser->id]);
            $row = $council->students()->firstOrFail();

            $this->assertNotNull($council->snapshot_taken_at, "Photo non prise pour {$formation->code}.");
            $this->assertEquals(14.0, (float) $row->general_average, "Moyenne inattendue pour {$formation->code}.");

            $closed = $this->closeCouncil($council, $president, [$pupil->id => [['passage']]]);

            $this->assertSame(Council::CLOSED, $closed->status, "Conseil non clôturé pour {$formation->code}.");
        }
    }

    public function test_a_final_term_council_counts_the_exams_of_every_semester(): void
    {
        $subject = $this->subject('Service', 2);
        [$teacherUser] = $this->teacher('Final', [$subject]);
        $pupil = $this->pupil('Awa');
        $this->grade($this->exam($subject, 'examen', 'Semestre 1'), $pupil, 10.0);
        $this->grade($this->exam($subject, 'examen', 'Semestre 2'), $pupil, 16.0);

        $president = $this->staff('direction');
        $council = $this->openCouncil($president, ['term' => config('eeht.final_term'), 'is_end_of_year' => true, 'main_teacher_id' => $teacherUser->id]);

        $this->assertEquals(13.0, (float) $council->students()->firstOrFail()->general_average);
        $this->assertTrue($council->is_end_of_year);
    }

    public function test_a_common_sitting_keeps_each_formation_its_own_students_and_alert_thresholds(): void
    {
        [$cap, $bts] = Formation::whereIn('code', ['CAP-REST', 'BTS-TOUR'])->orderBy('code')->get()->reverse()->values()->all();

        // Même moyenne (9) partout : seule la formation décide si l'élève est en vigilance ou en alerte rouge.
        AlertThreshold::saveFor($cap->id, 'red', ['max_average' => 8]);
        AlertThreshold::saveFor($cap->id, 'orange', ['max_average' => 10]);
        AlertThreshold::saveFor($bts->id, 'red', ['max_average' => 9.5]);
        AlertThreshold::saveFor($bts->id, 'orange', ['max_average' => 10]);

        $president = $this->staff('direction');
        $rows = [];
        foreach ([$cap, $bts] as $formation) {
            $this->formation = $formation;
            $this->class = SchoolClass::create(['name' => 'Classe '.$formation->code, 'formation_id' => $formation->id, 'academic_year_id' => $this->year->id]);
            $subject = $this->subject('Matière '.$formation->code, 2);
            [, $teacher] = $this->teacher('Prof'.$formation->id, [$subject]);
            $pupil = $this->pupil('Awa'.$formation->id);
            $this->grade($this->exam($subject), $pupil, 9.0);
            $rows[] = ['class' => $this->class, 'pupil' => $pupil, 'teacher' => $teacher, 'formation' => $formation];
        }

        $sitting = app(CouncilSittingService::class)->create([
            'academic_year_id' => $this->year->id, 'term' => 'Semestre 1', 'is_end_of_year' => false,
            'scheduled_at' => '2026-11-20 15:00:00', 'room' => 'Salle de conférence', 'agenda' => 'Bilan',
            'president_id' => $president->id, 'secretary_id' => null,
        ], collect($rows)->map(fn (array $row) => ['school_class_id' => $row['class']->id, 'main_teacher_id' => $row['teacher']->user_id])->all(), [], $president);

        $expected = [$cap->id => 'orange', $bts->id => 'red'];

        foreach ($rows as $row) {
            $council = Council::where('council_sitting_id', $sitting->id)->where('school_class_id', $row['class']->id)->firstOrFail();
            app(CouncilWorkflow::class)->schedule($council, $president);
            $students = $council->fresh()->students()->get();

            $this->assertCount(1, $students, "Le conseil de {$row['formation']->code} ne doit contenir que ses propres élèves.");
            $this->assertSame($row['pupil']->id, $students->first()->student_id);
            $this->assertSame($expected[$row['formation']->id], $students->first()->alert_level, "Seuils d'alerte inattendus pour {$row['formation']->code}.");
        }
    }
}

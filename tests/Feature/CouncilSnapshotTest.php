<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilStudent;
use App\Models\DisciplineRecord;
use App\Models\Grade;
use App\Models\Internship;
use App\Models\Partner;
use App\Models\ReportCard;
use App\Models\TimetableEntry;
use App\Services\Council\SnapshotService;
use App\Services\ReportCardCalculator;
use App\Support\CouncilSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * La photo des données (FIG-01) et les règles de calcul RG-01 à RG-05.
 */
class CouncilSnapshotTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
    }

    private function snapshotOf(Council $council, int $studentId): CouncilStudent
    {
        app(SnapshotService::class)->take($council);

        return $council->students()->where('student_id', $studentId)->firstOrFail();
    }

    private function absence(int $studentId, string $date, string $status, ?int $subjectId = null, ?int $entryId = null): void
    {
        DB::table('attendances')->insert([
            'student_id' => $studentId, 'school_class_id' => $this->class->id, 'subject_id' => $subjectId, 'timetable_entry_id' => $entryId,
            'date' => $date, 'status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_rg01_the_average_and_rank_are_those_of_the_bulletin_calculator(): void
    {
        $cuisine = $this->subject('Cuisine', 3);
        $anglais = $this->subject('Anglais', 1);
        $awa = $this->pupil('Awa');
        $moussa = $this->pupil('Moussa');
        $exam = $this->exam($cuisine);
        $english = $this->exam($anglais, 'devoir');
        $this->grade($exam, $awa, 15);
        $this->grade($english, $awa, 9);
        $this->grade($exam, $moussa, 17);
        $this->grade($english, $moussa, null, Grade::ABSENT_JUSTIFIED);
        $council = $this->makeCouncil();

        $row = $this->snapshotOf($council, $awa->id);
        $expected = collect(app(ReportCardCalculator::class)->computeForClass($this->class, $this->year->id, 'Semestre 1'))
            ->first(fn ($result) => $result['student']->id === $awa->id);

        $this->assertSame($expected['average'], $row->general_average);
        $this->assertSame($expected['rank'], $row->rank);
        $this->assertSame(2, $row->rank);
        $this->assertSame(2, $row->class_size);
        $this->assertSame($expected['class_average'], $row->snapshot['averages']['class_average']);
    }

    public function test_rg02_progression_is_this_term_minus_the_previous_one(): void
    {
        $cuisine = $this->subject('Cuisine');
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($cuisine, 'examen', 'Semestre 1'), $awa, 10);
        $this->grade($this->exam($cuisine, 'examen', 'Semestre 2'), $awa, 13);

        $first = $this->makeCouncil();
        $second = $this->makeCouncil(['term' => 'Semestre 2', 'is_end_of_year' => true]);

        $this->assertNull($this->snapshotOf($first, $awa->id)->progression, 'Vide pour la première période.');
        $row = $this->snapshotOf($second, $awa->id);
        $this->assertSame(10.0, $row->previous_average);
        $this->assertSame(3.0, $row->progression);
    }

    public function test_rg02_a_generated_bulletin_is_the_reference_for_the_previous_term(): void
    {
        $cuisine = $this->subject('Cuisine');
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($cuisine, 'examen', 'Semestre 1'), $awa, 10);
        $this->grade($this->exam($cuisine, 'examen', 'Semestre 2'), $awa, 13);
        ReportCard::create(['student_id' => $awa->id, 'school_class_id' => $this->class->id, 'academic_year_id' => $this->year->id, 'term' => 'Semestre 1', 'average' => 11.5]);

        $row = $this->snapshotOf($this->makeCouncil(['term' => 'Semestre 2']), $awa->id);

        $this->assertSame(11.5, $row->previous_average);
        $this->assertSame(1.5, $row->progression);
    }

    public function test_rg03_group_averages_are_weighted_and_the_internship_has_none(): void
    {
        $cuisine = $this->subject('Cuisine', 3, 'professionnel');
        $service = $this->subject('Service', 1, 'professionnel');
        $anglais = $this->subject('Anglais', 2, 'general');
        $stage = $this->subject('Stage en entreprise', 2, 'stage');
        $gestion = $this->subject('Gestion', 1);
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($cuisine), $awa, 16);
        $this->grade($this->exam($service), $awa, 8);
        $this->grade($this->exam($anglais), $awa, 12);
        $this->grade($this->exam($stage), $awa, 18);
        $this->grade($this->exam($gestion), $awa, 7);

        $groups = collect($this->snapshotOf($this->makeCouncil(), $awa->id)->snapshot['groups'])->keyBy('code');

        $this->assertEquals(14.0, $groups['professionnel']['average'], '(16×3 + 8×1) ÷ 4');
        $this->assertEquals(12.0, $groups['general']['average']);
        $this->assertNull($groups['stage']['average'], 'Le stage est une appréciation, hors moyenne.');
        $this->assertTrue($groups['stage']['qualitative']);
        $this->assertEquals(7.0, $groups['autres']['average'], 'Une matière non classée tombe dans « Autres matières ».');
    }

    public function test_the_number_of_subjects_under_ten_is_counted(): void
    {
        $awa = $this->pupil('Awa');
        foreach ([['A', 8], ['B', 9.99], ['C', 10], ['D', 15]] as [$name, $score]) {
            $this->grade($this->exam($this->subject($name)), $awa, $score);
        }

        $this->assertSame(2, $this->snapshotOf($this->makeCouncil(), $awa->id)->failed_subjects_count);
    }

    public function test_rg05_absence_hours_follow_the_lesson_length_or_the_school_default(): void
    {
        $cuisine = $this->subject('Cuisine');
        $awa = $this->pupil('Awa');
        $entry = TimetableEntry::create(['school_class_id' => $this->class->id, 'subject_id' => $cuisine->id, 'day_of_week' => 1, 'start_time' => '08:00:00', 'end_time' => '11:00:00']);
        CouncilSettings::update(['default_absence_hours' => 1.5]);

        $this->absence($awa->id, '2026-10-05', 'absent', $cuisine->id, $entry->id);   // lundi, créneau lié : 3 h
        $this->absence($awa->id, '2026-10-12', 'absent', $cuisine->id);               // lundi, même matière : 3 h
        $this->absence($awa->id, '2026-10-14', 'absent');                              // aucun créneau : 1,5 h
        $this->absence($awa->id, '2026-10-19', 'absence_justifiee', $cuisine->id);     // justifiée : 3 h
        $this->absence($awa->id, '2026-10-20', 'retard');
        $this->absence($awa->id, '2027-05-04', 'absent');                              // semestre 2 : hors période

        $row = $this->snapshotOf($this->makeCouncil(), $awa->id);

        $this->assertSame(7.5, $row->unjustified_absence_hours);
        $this->assertEquals(7.5, $row->snapshot['attendance']['unjustified_hours']);
        $this->assertEquals(3.0, $row->snapshot['attendance']['justified_hours']);
        $this->assertSame(1, $row->snapshot['attendance']['late_count']);
        $this->assertSame(3, $row->snapshot['attendance']['unjustified_count']);
    }

    public function test_sanctions_of_the_period_and_class_exclusions_are_in_the_snapshot(): void
    {
        $awa = $this->pupil('Awa');
        foreach ([['2026-10-02', 'avertissement'], ['2026-10-09', 'exclusion_cours'], ['2026-10-16', 'exclusion_cours'], ['2027-04-01', 'exclusion']] as [$date, $level]) {
            DisciplineRecord::create(['student_id' => $awa->id, 'school_class_id' => $this->class->id, 'occurred_on' => $date, 'level' => $level, 'reason' => 'Motif interne']);
        }

        $snapshot = $this->snapshotOf($this->makeCouncil(), $awa->id)->snapshot;

        $this->assertSame(3, $snapshot['discipline']['count'], 'La sanction du semestre 2 est hors période.');
        $this->assertSame('exclusion_cours', $snapshot['discipline']['max_level']);
        $this->assertSame(2, $snapshot['attendance']['class_exclusions']);
    }

    public function test_the_latest_internship_is_in_the_snapshot(): void
    {
        $awa = $this->pupil('Awa');
        $partner = Partner::create(['name' => 'Hôtel Téranga']);
        Internship::create(['student_id' => $awa->id, 'partner_id' => $partner->id, 'title' => 'Stage cuisine', 'start_date' => '2026-07-01', 'status' => 'termine', 'evaluation_score' => 15]);
        Internship::create(['student_id' => $awa->id, 'partner_id' => $partner->id, 'title' => 'Ancien stage', 'start_date' => '2025-07-01', 'status' => 'termine']);

        $internship = $this->snapshotOf($this->makeCouncil(), $awa->id)->snapshot['internship'];

        $this->assertSame('Stage cuisine', $internship['title']);
        $this->assertSame('Hôtel Téranga', $internship['company']);
        $this->assertEquals(15.0, $internship['score']);
    }

    public function test_the_alert_is_computed_with_the_thresholds_of_the_formation(): void
    {
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $awa, 9);

        $row = $this->snapshotOf($this->makeCouncil(), $awa->id);

        $this->assertSame('red', $row->alert_level);
        $this->assertStringContainsString('Moyenne générale de 9', $row->alert_reasons[0]);
    }

    public function test_a_student_without_any_grade_has_no_average_and_no_average_alert(): void
    {
        $awa = $this->pupil('Awa');

        $row = $this->snapshotOf($this->makeCouncil(), $awa->id);

        $this->assertNull($row->general_average);
        $this->assertSame('green', $row->alert_level);
    }
}

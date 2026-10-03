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
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fiche d'un enfant dans l'espace parent : résumé, historique des pointages et protection par parent. */
class ParentChildPageTest extends TestCase
{
    use RefreshDatabase;

    private User $parent;

    private Student $child;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-05 09:30:00'));

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        $this->parent = User::factory()->create();
        $this->parent->assignRole('parent');
        $this->child = Student::create([
            'matricule' => 'T-1', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
            'school_class_id' => $this->class->id, 'formation_id' => $formation->id, 'parent_user_id' => $this->parent->id,
        ]);
    }

    public function test_the_child_page_carries_the_summary_and_the_latest_attendance_records_newest_first(): void
    {
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $this->class->formation_id, 'coefficient' => 2]);
        $exam = Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $this->class->id, 'subject_id' => $subject->id,
            'term' => 'Semestre 1', 'exam_date' => now(), 'max_score' => 20, 'coefficient' => 1, 'is_published' => true,
        ]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $this->child->id, 'score' => 14, 'is_absent' => false]);

        $invoice = Invoice::create(['student_id' => $this->child->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000, 'discount' => 0]);
        $invoice->payments()->create(['amount' => 10000, 'method' => 'especes', 'paid_at' => now()]);

        $ids = [];
        for ($i = 0; $i < 35; $i++) {
            $ids[] = Attendance::create([
                'student_id' => $this->child->id, 'school_class_id' => $this->class->id, 'subject_id' => $i === 0 ? $subject->id : null,
                'date' => now()->subDays($i)->toDateString(), 'status' => $i % 2 ? 'absent' : 'present',
            ])->id;
        }

        $this->actingAs($this->parent)->get(route('parent.child', $this->child))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Parent/Child')
            ->where('summary.average', fn ($value) => (float) $value === 14.0)
            ->where('summary.balance_due', fn ($value) => (float) $value === 15000.0)
            ->has('attendanceRecords', 30)
            ->where('attendanceRecords.0.id', $ids[0])
            ->where('attendanceRecords.0.subject.name', 'Cuisine')
            ->where('attendanceRecords.29.id', $ids[29])
            ->where('attendanceStats.absent', 17));
    }

    public function test_a_child_without_grades_or_invoices_has_an_empty_summary(): void
    {
        $this->actingAs($this->parent)->get(route('parent.child', $this->child))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('summary.average', null)
            ->where('summary.balance_due', fn ($value) => (float) $value === 0.0)
            ->has('attendanceRecords', 0));
    }

    public function test_a_parent_cannot_open_another_parents_child(): void
    {
        $stranger = User::factory()->create();
        $stranger->assignRole('parent');

        $this->actingAs($stranger)->get(route('parent.child', $this->child))->assertForbidden();
    }
}

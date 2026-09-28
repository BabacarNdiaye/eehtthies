<?php

namespace Tests\Feature;

use App\Mail\GradeEntryReminder;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendGradeEntryRemindersTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $schoolClass;
    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $academicYear = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->schoolClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $academicYear->id]);
        $this->subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id]);

        Student::create(['matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Un', 'status' => 'actif', 'school_class_id' => $this->schoolClass->id]);
        Student::create(['matricule' => 'TEST-'.uniqid(), 'first_name' => 'Modou', 'last_name' => 'Deux', 'status' => 'actif', 'school_class_id' => $this->schoolClass->id]);
    }

    private function makeExam(int $daysAgo): Exam
    {
        return Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id, 'term' => 'Semestre 1', 'exam_date' => now()->subDays($daysAgo),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => false,
        ]);
    }

    private function makeTeacherWithEmail(Exam $exam, string $email = 'prof@example.com'): Teacher
    {
        $teacher = Teacher::create(['matricule' => 'PROF-'.uniqid(), 'first_name' => 'Fatou', 'last_name' => 'Ba', 'email' => $email]);
        $exam->invigilators()->attach($teacher->id);

        return $teacher;
    }

    public function test_reminds_the_invigilator_when_grades_are_missing_at_the_3_day_milestone(): void
    {
        Mail::fake();
        $exam = $this->makeExam(3);
        $this->makeTeacherWithEmail($exam);
        // only 1 of 2 students graded

        $students = Student::all();
        Grade::create(['exam_id' => $exam->id, 'student_id' => $students[0]->id, 'score' => 12]);

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertSent(GradeEntryReminder::class, fn ($mail) => $mail->hasTo('prof@example.com') && $mail->missingCount === 1);
    }

    public function test_does_not_remind_on_a_non_milestone_day(): void
    {
        Mail::fake();
        $exam = $this->makeExam(4); // not in [3, 7]
        $this->makeTeacherWithEmail($exam);

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertNothingSent();
    }

    public function test_does_not_remind_when_all_grades_are_already_entered(): void
    {
        Mail::fake();
        $exam = $this->makeExam(3);
        $this->makeTeacherWithEmail($exam);

        foreach (Student::all() as $student) {
            Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 12]);
        }

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertNothingSent();
    }

    public function test_falls_back_to_the_exam_creator_when_no_invigilator_is_assigned(): void
    {
        Mail::fake();
        $creator = User::factory()->create(['email' => 'creator@example.com']);
        $exam = $this->makeExam(7);
        $exam->update(['created_by' => $creator->id]);

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertSent(GradeEntryReminder::class, fn ($mail) => $mail->hasTo('creator@example.com'));
    }

    public function test_skips_silently_when_there_is_no_contact_at_all(): void
    {
        Mail::fake();
        $this->makeExam(3); // no invigilator, no creator

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertNothingSent();
    }

    public function test_does_not_remind_for_an_exam_in_the_future(): void
    {
        Mail::fake();
        $exam = Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id, 'term' => 'Semestre 1', 'exam_date' => now()->addDays(3),
            'max_score' => 20, 'coefficient' => 1, 'is_published' => false,
        ]);
        $this->makeTeacherWithEmail($exam);

        Artisan::call('app:send-grade-entry-reminders');

        Mail::assertNothingSent();
    }
}

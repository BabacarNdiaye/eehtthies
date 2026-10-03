<?php

namespace Tests\Feature;

use App\Mail\AbsenceAlert;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendAbsenceAlertsTest extends TestCase
{
    use RefreshDatabase;

    private ?SchoolClass $schoolClass = null;

    private function schoolClass(): SchoolClass
    {
        if (! $this->schoolClass) {
            $academicYear = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
            $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
            $this->schoolClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $academicYear->id]);
        }

        return $this->schoolClass;
    }

    private function makeStudentWithParentEmail(string $email = 'parent@example.com'): Student
    {
        $parent = User::factory()->create(['email' => $email]);

        return Student::create([
            'matricule' => 'TEST-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Test',
            'status' => 'actif',
            'parent_user_id' => $parent->id,
        ]);
    }

    private function addUnjustifiedAbsences(Student $student, int $count, string $status = 'absent'): void
    {
        for ($i = 1; $i <= $count; $i++) {
            Attendance::create([
                'student_id' => $student->id,
                'school_class_id' => $this->schoolClass()->id,
                'date' => now()->subDays($i),
                'status' => $status,
            ]);
        }
    }

    public function test_sends_an_alert_exactly_on_the_3_absence_milestone(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->addUnjustifiedAbsences($student, 3);

        Artisan::call('app:send-absence-alerts');

        Mail::assertSent(AbsenceAlert::class, fn ($mail) => $mail->student->is($student) && $mail->totalUnjustified === 3);
    }

    public function test_does_not_send_an_alert_on_a_non_milestone_count(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->addUnjustifiedAbsences($student, 4); // 4 n'est pas dans [3,5,8,12]

        Artisan::call('app:send-absence-alerts');

        Mail::assertNothingSent();
    }

    public function test_sends_again_once_a_later_milestone_is_reached(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->addUnjustifiedAbsences($student, 5);

        Artisan::call('app:send-absence-alerts');

        Mail::assertSent(AbsenceAlert::class, fn ($mail) => $mail->totalUnjustified === 5);
    }

    public function test_justified_absences_never_count_toward_the_milestone(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->addUnjustifiedAbsences($student, 3, 'absence_justifiee');

        Artisan::call('app:send-absence-alerts');

        Mail::assertNothingSent();
    }

    public function test_absences_from_before_the_current_school_year_are_not_counted(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        for ($i = 1; $i <= 3; $i++) {
            Attendance::create([
                'student_id' => $student->id,
                'school_class_id' => $this->schoolClass()->id,
                'date' => now()->subYear(),
                'status' => 'absent',
            ]);
        }

        Artisan::call('app:send-absence-alerts');

        Mail::assertNothingSent();
    }

    public function test_ignores_students_with_no_contact_email(): void
    {
        Mail::fake();
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif',
        ]);
        $this->addUnjustifiedAbsences($student, 3);

        Artisan::call('app:send-absence-alerts');

        Mail::assertNothingSent();
    }

    public function test_the_email_includes_the_5_most_recent_absences(): void
    {
        Mail::fake();
        $student = $this->makeStudentWithParentEmail();
        $this->addUnjustifiedAbsences($student, 8); // seuil atteint, plus de 5 absences

        Artisan::call('app:send-absence-alerts');

        Mail::assertSent(AbsenceAlert::class, function ($mail) {
            return $mail->totalUnjustified === 8 && $mail->recentAbsences->count() === 5;
        });
    }
}

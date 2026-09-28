<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AttendanceLatenessTest extends TestCase
{
    use RefreshDatabase;

    private function makeClassAndStudent(): array
    {
        $formation = Formation::create([
            'name' => 'Formation Retard',
            'code' => 'RET-'.uniqid(),
            'slug' => 'formation-retard-'.uniqid(),
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );

        $schoolClass = SchoolClass::create([
            'name' => 'Classe Retard',
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);

        $subject = Subject::create([
            'name' => 'Matière Retard',
            'coefficient' => 1,
            'formation_id' => $formation->id,
        ]);

        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Bineta',
            'last_name' => 'Diallo',
            'school_class_id' => $schoolClass->id,
            'status' => 'actif',
        ]);

        return [$schoolClass, $subject, $student];
    }

    public function test_scan_within_grace_period_is_present_and_linked_to_the_period(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$schoolClass, $subject, $student] = $this->makeClassAndStudent();

        $now = Carbon::parse('2026-09-28 08:02:00'); // a Monday
        Carbon::setTestNow($now);

        $entry = TimetableEntry::create([
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'day_of_week' => $now->dayOfWeekIso,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $user = User::factory()->create();
        $user->assignRole('super-admin');

        $response = $this->actingAs($user)->post(route('admin.pointage.scan'), [
            'student_id' => $student->id,
            'school_class_id' => $schoolClass->id,
            'date' => $now->toDateString(),
        ]);

        $response->assertOk();
        $response->assertJson(['status' => 'present']);

        $this->assertDatabaseHas('attendances', [
            'student_id' => $student->id,
            'status' => 'present',
            'timetable_entry_id' => $entry->id,
        ]);

        Carbon::setTestNow();
    }

    public function test_scan_after_grace_period_is_marked_retard_with_late_minutes_and_notifies(): void
    {
        Notification::fake();
        $this->seed(RolesAndPermissionsSeeder::class);
        [$schoolClass, $subject, $student] = $this->makeClassAndStudent();

        $studentUser = User::factory()->create();
        $studentUser->assignRole('eleve');
        $student->update(['user_id' => $studentUser->id]);

        $now = Carbon::parse('2026-09-28 08:12:00'); // 12 minutes late, grace is 5
        Carbon::setTestNow($now);

        $entry = TimetableEntry::create([
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'day_of_week' => $now->dayOfWeekIso,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $user = User::factory()->create();
        $user->assignRole('super-admin');

        $response = $this->actingAs($user)->post(route('admin.pointage.scan'), [
            'student_id' => $student->id,
            'school_class_id' => $schoolClass->id,
            'date' => $now->toDateString(),
        ]);

        $response->assertOk();
        $response->assertJson(['status' => 'retard', 'late_minutes' => 12]);

        $this->assertDatabaseHas('attendances', [
            'student_id' => $student->id,
            'status' => 'retard',
            'timetable_entry_id' => $entry->id,
        ]);

        Notification::assertSentTo($studentUser, \App\Notifications\PushAlert::class);

        Carbon::setTestNow();
    }

    public function test_scan_with_no_matching_period_behaves_like_before(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$schoolClass, , $student] = $this->makeClassAndStudent();
        // Deliberately no TimetableEntry created for this class.

        $user = User::factory()->create();
        $user->assignRole('super-admin');

        $response = $this->actingAs($user)->post(route('admin.pointage.scan'), [
            'student_id' => $student->id,
            'school_class_id' => $schoolClass->id,
            'date' => '2026-09-28',
        ]);

        $response->assertOk();
        $response->assertJson(['status' => 'present', 'late_minutes' => 0]);

        $this->assertDatabaseHas('attendances', [
            'student_id' => $student->id,
            'status' => 'present',
            'timetable_entry_id' => null,
            'checked_in_at' => null,
        ]);
    }
}

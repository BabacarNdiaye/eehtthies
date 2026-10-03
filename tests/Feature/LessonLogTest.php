<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LessonLogTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeacherWithEntry(Carbon $now): array
    {
        $formation = Formation::create([
            'name' => 'Formation Cahier',
            'code' => 'CAH-'.uniqid(),
            'slug' => 'formation-cahier-'.uniqid(),
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );

        $schoolClass = SchoolClass::create([
            'name' => 'Classe Cahier',
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);

        $subject = Subject::create([
            'name' => 'Matière Cahier',
            'coefficient' => 1,
            'formation_id' => $formation->id,
        ]);

        $user = User::factory()->create();
        $user->assignRole('enseignant');

        $teacher = Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Modou',
            'last_name' => 'Fall',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $entry = TimetableEntry::create([
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => $now->dayOfWeekIso,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        return [$user, $teacher, $entry];
    }

    public function test_teacher_can_log_their_own_session(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $now = Carbon::parse('2026-09-28'); // un lundi
        [$user, , $entry] = $this->makeTeacherWithEntry($now);

        $response = $this->actingAs($user)->post(route('teacher.lesson-log.store'), [
            'timetable_entry_id' => $entry->id,
            'date' => $now->toDateString(),
            'content' => 'Introduction aux fonctions.',
            'homework' => 'Exercices 1 à 5 page 12.',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('lesson_logs', [
            'timetable_entry_id' => $entry->id,
            'teacher_id' => $entry->teacher_id,
            'content' => 'Introduction aux fonctions.',
        ]);

        // SQLite stocke les colonnes converties en `date` sous forme de datetimes complets — même
        // particularité que celle déjà contournée de cette façon par AttendanceQrScanTest.
        $storedDate = DB::table('lesson_logs')
            ->where('timetable_entry_id', $entry->id)
            ->value('date');
        $this->assertEquals($now->toDateString(), Carbon::parse($storedDate)->format('Y-m-d'));
    }

    public function test_teacher_cannot_log_a_colleagues_session(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $now = Carbon::parse('2026-09-28');
        [, , $entry] = $this->makeTeacherWithEntry($now);

        $otherUser = User::factory()->create();
        $otherUser->assignRole('enseignant');
        $otherTeacher = Teacher::create([
            'user_id' => $otherUser->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Ndoye',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $response = $this->actingAs($otherUser)->post(route('teacher.lesson-log.store'), [
            'timetable_entry_id' => $entry->id,
            'date' => $now->toDateString(),
            'content' => 'Tentative non autorisée.',
        ]);

        $response->assertNotFound();
        $this->assertDatabaseMissing('lesson_logs', ['teacher_id' => $otherTeacher->id]);
    }

    public function test_date_not_matching_the_entrys_day_of_week_is_rejected(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $now = Carbon::parse('2026-09-28'); // Lundi
        [$user, , $entry] = $this->makeTeacherWithEntry($now);

        $response = $this->actingAs($user)->post(route('teacher.lesson-log.store'), [
            'timetable_entry_id' => $entry->id,
            'date' => $now->copy()->addDay()->toDateString(), // Mardi, l'entrée n'existe que le lundi
            'content' => 'Devrait être rejeté.',
        ]);

        $response->assertStatus(422);
    }
}

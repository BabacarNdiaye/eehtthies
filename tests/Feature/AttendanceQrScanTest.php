<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AttendanceQrScanTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_mark_a_student_present_from_a_qr_scan_payload(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create([
            'name' => 'Formation QR',
            'code' => 'QR-'.uniqid(),
            'slug' => 'formation-qr-'.uniqid(),
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );

        $schoolClass = SchoolClass::create([
            'name' => 'Classe QR',
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);

        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Alice',
            'last_name' => 'Tester',
            'school_class_id' => $schoolClass->id,
            'status' => 'actif',
        ]);

        $user = User::factory()->create();
        $user->assignRole('super-admin');

        $response = $this->actingAs($user)->post(route('admin.pointage.scan'), [
            'student_id' => $student->id,
            'school_class_id' => $schoolClass->id,
            'date' => '2026-08-28',
            'status' => 'present',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('attendances', [
            'student_id' => $student->id,
            'school_class_id' => $schoolClass->id,
            'status' => 'present',
            'subject_id' => null,
        ]);

        $storedDate = DB::table('attendances')
            ->where('student_id', $student->id)
            ->value('date');

        $this->assertEquals('2026-08-28', Carbon::parse($storedDate)->format('Y-m-d'));
    }
}

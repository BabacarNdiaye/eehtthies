<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\Room;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Illuminate\Database\Seeder;

class PedagogyDemoSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::where('is_current', true)->first() ?? AcademicYear::first();
        $formation = Formation::where('code', 'BTS-HR')->first();

        if (! $year || ! $formation) {
            return;
        }

        $rooms = [
            ['name' => 'Salle A1', 'type' => 'Salle de classe', 'capacity' => 35],
            ['name' => 'Atelier Cuisine 1', 'type' => 'Atelier professionnel', 'capacity' => 20],
            ['name' => 'Restaurant d\'application', 'type' => 'Atelier professionnel', 'capacity' => 40],
        ];
        foreach ($rooms as $r) {
            Room::firstOrCreate(['name' => $r['name']], $r);
        }
        $salleA1 = Room::where('name', 'Salle A1')->first();
        $atelier = Room::where('name', 'Atelier Cuisine 1')->first();

        $schoolClass = SchoolClass::firstOrCreate(
            ['name' => 'BTS Hôtellerie 1ère année', 'formation_id' => $formation->id, 'academic_year_id' => $year->id],
            ['capacity' => 40]
        );

        $subjectsData = [
            ['name' => 'Cuisine appliquée', 'code' => 'CUIS-APP', 'coefficient' => 4],
            ['name' => 'Service et commercialisation', 'code' => 'SERV-COM', 'coefficient' => 3],
            ['name' => 'Anglais professionnel', 'code' => 'ANG-PRO', 'coefficient' => 2],
            ['name' => 'Gestion hôtelière', 'code' => 'GEST-HOT', 'coefficient' => 3],
        ];
        $subjects = collect($subjectsData)->map(
            fn ($s) => Subject::firstOrCreate(['code' => $s['code']], [...$s, 'formation_id' => $formation->id])
        );

        $teachers = Teacher::take(3)->get();
        if ($teachers->isEmpty()) {
            return;
        }

        foreach ($subjects as $i => $subject) {
            $subject->teachers()->syncWithoutDetaching([$teachers[$i % $teachers->count()]->id]);
        }

        $studentsData = [
            ['first_name' => 'Mamadou', 'last_name' => 'Ndao', 'gender' => 'M', 'email' => 'mamadou.ndao@eeht-thies.sn', 'guardian_name' => 'Ibrahima Ndao', 'guardian_email' => 'ibrahima.ndao@gmail.com'],
            ['first_name' => 'Fatou', 'last_name' => 'Gueye', 'gender' => 'F', 'email' => 'fatou.gueye@eeht-thies.sn', 'guardian_name' => 'Awa Gueye', 'guardian_email' => 'awa.gueye@gmail.com'],
            ['first_name' => 'Ousmane', 'last_name' => 'Faye', 'gender' => 'M', 'email' => 'ousmane.faye@eeht-thies.sn', 'guardian_name' => 'Modou Faye', 'guardian_email' => 'modou.faye@gmail.com'],
            ['first_name' => 'Aminata', 'last_name' => 'Sow', 'gender' => 'F', 'email' => 'aminata.sow@eeht-thies.sn', 'guardian_name' => 'Khady Sow', 'guardian_email' => 'khady.sow@gmail.com'],
            ['first_name' => 'Cheikh', 'last_name' => 'Diallo', 'gender' => 'M', 'email' => 'cheikh.diallo@eeht-thies.sn', 'guardian_name' => 'Alioune Diallo', 'guardian_email' => 'alioune.diallo@gmail.com'],
        ];

        $students = collect();
        foreach ($studentsData as $index => $s) {
            $matricule = 'ELV-'.$year->start_date->format('Y').'-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            $students->push(Student::firstOrCreate(
                ['matricule' => $matricule],
                [
                    ...$s,
                    'formation_id' => $formation->id,
                    'school_class_id' => $schoolClass->id,
                    'academic_year_id' => $year->id,
                    'status' => 'actif',
                ]
            ));
        }

        $timetable = [
            ['subject' => 0, 'teacher' => 0, 'room' => $atelier->id, 'day' => 1, 'start' => '08:00', 'end' => '11:00'],
            ['subject' => 1, 'teacher' => 1, 'room' => $salleA1->id, 'day' => 1, 'start' => '11:30', 'end' => '13:00'],
            ['subject' => 2, 'teacher' => 2, 'room' => $salleA1->id, 'day' => 2, 'start' => '09:00', 'end' => '10:30'],
            ['subject' => 3, 'teacher' => 0, 'room' => $salleA1->id, 'day' => 3, 'start' => '08:00', 'end' => '10:00'],
        ];
        foreach ($timetable as $t) {
            TimetableEntry::firstOrCreate([
                'school_class_id' => $schoolClass->id,
                'subject_id' => $subjects[$t['subject']]->id,
                'day_of_week' => $t['day'],
                'start_time' => $t['start'],
            ], [
                'teacher_id' => $teachers[$t['teacher'] % $teachers->count()]->id,
                'room_id' => $t['room'],
                'end_time' => $t['end'],
            ]);
        }

        foreach ($students as $student) {
            Attendance::firstOrCreate([
                'student_id' => $student->id,
                'date' => now()->subDays(1)->toDateString(),
                'subject_id' => null,
            ], [
                'school_class_id' => $schoolClass->id,
                'status' => 'present',
            ]);
        }

        $exam = Exam::firstOrCreate([
            'title' => 'Devoir 1 - Cuisine appliquée',
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subjects[0]->id,
        ], [
            'type' => 'devoir',
            'session' => 'normale',
            'academic_year_id' => $year->id,
            'term' => 'Semestre 1',
            'exam_date' => now()->subDays(10),
            'max_score' => 20,
            'coefficient' => 1,
            'is_published' => true,
        ]);
        $exam->invigilators()->syncWithoutDetaching([$teachers[0]->id]);

        $scores = [14.5, 16, 11, 9.5, 17];
        foreach ($students as $i => $student) {
            Grade::firstOrCreate(
                ['exam_id' => $exam->id, 'student_id' => $student->id],
                ['score' => $scores[$i] ?? 12]
            );
        }
    }
}

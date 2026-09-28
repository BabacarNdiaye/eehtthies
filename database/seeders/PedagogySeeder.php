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

class PedagogySeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::where('is_current', true)->first() ?? AcademicYear::first();
        $formation = Formation::where('code', 'BTS-HR')->first();

        if (! $year || ! $formation) {
            return;
        }

        $rooms = [
            ['name' => 'Salle 101', 'type' => 'Salle de classe', 'capacity' => 35],
            ['name' => 'Atelier Cuisine 1', 'type' => 'Atelier pratique', 'capacity' => 20],
            ['name' => "Restaurant d'application", 'type' => 'Atelier pratique', 'capacity' => 25],
            ['name' => 'Amphithéâtre A', 'type' => 'Amphithéâtre', 'capacity' => 80],
        ];
        foreach ($rooms as $data) {
            Room::firstOrCreate(['name' => $data['name']], $data);
        }
        $roomClasse = Room::where('name', 'Salle 101')->first();
        $roomAtelier = Room::where('name', 'Atelier Cuisine 1')->first();

        $subjects = [
            ['name' => 'Cuisine professionnelle', 'code' => 'CUIS', 'coefficient' => 4],
            ['name' => 'Service en salle', 'code' => 'SERV', 'coefficient' => 3],
            ['name' => 'Gestion hôtelière', 'code' => 'GEST', 'coefficient' => 3],
            ['name' => 'Anglais professionnel', 'code' => 'ANGL', 'coefficient' => 2],
        ];
        foreach ($subjects as $data) {
            Subject::firstOrCreate(
                ['code' => $data['code']],
                [...$data, 'formation_id' => $formation->id]
            );
        }

        $schoolClass = SchoolClass::firstOrCreate(
            ['name' => 'BTS Hôtellerie 1ère année A'],
            ['formation_id' => $formation->id, 'academic_year_id' => $year->id, 'capacity' => 35]
        );

        $teachers = Teacher::all();
        $cuisine = Subject::where('code', 'CUIS')->first();
        $service = Subject::where('code', 'SERV')->first();
        $gestion = Subject::where('code', 'GEST')->first();
        $anglais = Subject::where('code', 'ANGL')->first();

        if ($teachers->isNotEmpty()) {
            $teachers->first()->subjects()->syncWithoutDetaching([$cuisine->id]);
        }

        $students = [
            ['first_name' => 'Awa', 'last_name' => 'Diop', 'gender' => 'F', 'email' => 'awa.diop@eeht-thies.sn', 'guardian_name' => 'Serigne Diop', 'guardian_email' => 'serigne.diop@gmail.com'],
            ['first_name' => 'Modou', 'last_name' => 'Fall', 'gender' => 'M', 'email' => 'modou.fall@eeht-thies.sn', 'guardian_name' => 'Ndeye Fall', 'guardian_email' => 'ndeye.fall@gmail.com'],
            ['first_name' => 'Bineta', 'last_name' => 'Sow', 'gender' => 'F', 'email' => 'bineta.sow@eeht-thies.sn', 'guardian_name' => 'Abdou Sow', 'guardian_email' => 'abdou.sow@gmail.com'],
            ['first_name' => 'Cheikh', 'last_name' => 'Ndiaye', 'gender' => 'M', 'email' => 'cheikh.ndiaye@eeht-thies.sn', 'guardian_name' => 'Coumba Ndiaye', 'guardian_email' => 'coumba.ndiaye@gmail.com'],
            ['first_name' => 'Rokhaya', 'last_name' => 'Gueye', 'gender' => 'F', 'email' => 'rokhaya.gueye@eeht-thies.sn', 'guardian_name' => 'Lamine Gueye', 'guardian_email' => 'lamine.gueye@gmail.com'],
            ['first_name' => 'Ousmane', 'last_name' => 'Diallo', 'gender' => 'M', 'email' => 'ousmane.diallo@eeht-thies.sn', 'guardian_name' => 'Fatim Diallo', 'guardian_email' => 'fatim.diallo@gmail.com'],
        ];

        $createdStudents = collect();
        foreach ($students as $i => $data) {
            $matricule = 'ELV-2026-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT);
            $student = Student::firstOrCreate(
                ['matricule' => $matricule],
                [
                    ...$data,
                    'formation_id' => $formation->id,
                    'school_class_id' => $schoolClass->id,
                    'academic_year_id' => $year->id,
                    'status' => 'actif',
                ]
            );
            $createdStudents->push($student);
        }

        $timetable = [
            ['subject_id' => $cuisine->id, 'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '10:00', 'room_id' => $roomAtelier->id],
            ['subject_id' => $service->id, 'day_of_week' => 1, 'start_time' => '10:15', 'end_time' => '12:00', 'room_id' => $roomClasse->id],
            ['subject_id' => $gestion->id, 'day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '10:00', 'room_id' => $roomClasse->id],
            ['subject_id' => $anglais->id, 'day_of_week' => 3, 'start_time' => '10:15', 'end_time' => '12:00', 'room_id' => $roomClasse->id],
        ];

        foreach ($timetable as $entry) {
            TimetableEntry::firstOrCreate(
                [
                    'school_class_id' => $schoolClass->id,
                    'subject_id' => $entry['subject_id'],
                    'day_of_week' => $entry['day_of_week'],
                    'start_time' => $entry['start_time'],
                ],
                [...$entry, 'school_class_id' => $schoolClass->id, 'teacher_id' => $teachers->first()?->id]
            );
        }

        // For each subject, seed the classic Senegalese bulletin structure:
        // 2 "devoir" evaluations + 1 "composition" (end-of-term exam), per term.
        $subjectModels = [$cuisine, $service, $gestion, $anglais];

        foreach (config('eeht.terms') as $termIndex => $term) {
            foreach ($subjectModels as $subject) {
                $baseDate = $termIndex === 0 ? now()->subMonths(4) : now()->subDays(30);

                $termExams = [
                    ['title' => "Devoir n°1 - {$subject->name} ({$term})", 'type' => 'devoir', 'exam_date' => $baseDate->copy()->addDays(5)],
                    ['title' => "Devoir n°2 - {$subject->name} ({$term})", 'type' => 'devoir', 'exam_date' => $baseDate->copy()->addDays(25)],
                    ['title' => "Composition - {$subject->name} ({$term})", 'type' => 'examen', 'exam_date' => $baseDate->copy()->addDays(45)],
                ];

                foreach ($termExams as $data) {
                    $exam = Exam::firstOrCreate(
                        ['title' => $data['title']],
                        [
                            'type' => $data['type'],
                            'session' => 'normale',
                            'school_class_id' => $schoolClass->id,
                            'subject_id' => $subject->id,
                            'academic_year_id' => $year->id,
                            'term' => $term,
                            'exam_date' => $data['exam_date'],
                            'max_score' => 20,
                            'coefficient' => 1,
                            'is_published' => true,
                        ]
                    );

                    foreach ($createdStudents as $student) {
                        Grade::firstOrCreate(
                            ['exam_id' => $exam->id, 'student_id' => $student->id],
                            ['score' => rand(70, 190) / 10]
                        );
                    }
                }
            }
        }

        // A few attendance records spread across the year so bulletins show
        // realistic retard/absence figures instead of always zero.
        foreach ($createdStudents as $i => $student) {
            $offset = 30 + ($i * 15);
            Attendance::firstOrCreate(
                ['student_id' => $student->id, 'date' => $year->start_date->copy()->addDays($offset), 'subject_id' => null],
                ['school_class_id' => $schoolClass->id, 'status' => $i % 3 === 0 ? 'retard' : 'present']
            );
            Attendance::firstOrCreate(
                ['student_id' => $student->id, 'date' => $year->start_date->copy()->addDays($offset + 60), 'subject_id' => null],
                ['school_class_id' => $schoolClass->id, 'status' => $i % 2 === 0 ? 'absence_justifiee' : 'present']
            );
            Attendance::firstOrCreate(
                ['student_id' => $student->id, 'date' => $year->start_date->copy()->addDays($offset + 200), 'subject_id' => null],
                ['school_class_id' => $schoolClass->id, 'status' => $i % 4 === 0 ? 'absent' : 'present']
            );
        }
    }
}

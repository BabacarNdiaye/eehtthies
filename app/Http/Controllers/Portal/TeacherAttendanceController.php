<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Services\AttendanceCheckInResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets a teacher take attendance for their own classes/subjects only, unlike
 * the shared /admin/pointage page which isn't scoped to the acting teacher.
 */
class TeacherAttendanceController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    /** Distinct (class, subject) pairs this teacher actually teaches, from the timetable. */
    private function classSubjectPairs(Teacher $teacher): Collection
    {
        return TimetableEntry::where('teacher_id', $teacher->id)
            ->with('schoolClass:id,name', 'subject:id,name')
            ->get(['school_class_id', 'subject_id'])
            ->unique(fn ($e) => $e->school_class_id.'-'.$e->subject_id)
            ->values();
    }

    private function authorizePair(Teacher $teacher, int $classId, int $subjectId): void
    {
        $allowed = $this->classSubjectPairs($teacher)->contains(
            fn ($e) => $e->school_class_id === $classId && $e->subject_id === $subjectId
        );

        abort_unless($allowed, 403, "Vous n'enseignez pas cette matière dans cette classe.");
    }

    public function index(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $pairs = $this->classSubjectPairs($teacher);

        $schoolClassId = $request->integer('school_class_id') ?: null;
        $subjectId = $request->integer('subject_id') ?: null;
        $date = $request->string('date')->toString() ?: now()->toDateString();

        $students = collect();
        $existing = collect();

        if ($schoolClassId && $subjectId) {
            $this->authorizePair($teacher, $schoolClassId, $subjectId);

            $students = Student::where('school_class_id', $schoolClassId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name']);

            $existing = Attendance::where('school_class_id', $schoolClassId)
                ->where('subject_id', $subjectId)
                ->where('date', $date)
                ->get()
                ->keyBy('student_id');
        }

        return Inertia::render('Portal/Teacher/Attendance', [
            'pairs' => $pairs->map(fn ($e) => [
                'school_class_id' => $e->school_class_id,
                'subject_id' => $e->subject_id,
                'class_name' => $e->schoolClass->name,
                'subject_name' => $e->subject->name,
            ])->values(),
            'students' => $students,
            'existing' => $existing,
            'selectedClassId' => $schoolClassId,
            'selectedSubjectId' => $subjectId,
            'date' => $date,
            'statuses' => Attendance::STATUSES,
        ]);
    }

    public function store(Request $request, AttendanceCheckInResolver $resolver)
    {
        $teacher = $this->teacher($request);

        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'date' => ['required', 'date'],
            'records' => ['required', 'array'],
            'records.*.student_id' => ['required', 'exists:students,id'],
            'records.*.status' => ['required', 'in:present,absent,retard,absence_justifiee'],
            'records.*.justification' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->authorizePair($teacher, (int) $data['school_class_id'], (int) $data['subject_id']);

        $entry = $resolver->scheduledPeriod((int) $data['school_class_id'], (int) $data['subject_id'], $data['date']);

        foreach ($data['records'] as $record) {
            $resolver->recordAttendance(
                (int) $record['student_id'],
                (int) $data['school_class_id'],
                (int) $data['subject_id'],
                $data['date'],
                $record['status'],
                $record['justification'] ?? null,
                $request->user()->id,
                $entry,
            );
        }

        return back()->with('success', 'Présences enregistrées avec succès.');
    }
}

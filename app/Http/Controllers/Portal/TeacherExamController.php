<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Permet à un enseignant de programmer ses propres évaluations de catégorie « devoir » (devoir,
 * interrogation, contrôle) pour les classes et matières qu'il enseigne réellement — une version plus légère,
 * en libre-service, de Admin\ExamController, limitée à l'emploi du temps de l'enseignant et aux évaluations
 * qu'il a créées.
 */
class TeacherExamController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    /** Paires (classe, matière) distinctes que cet enseignant enseigne réellement, d'après l'emploi du temps. */
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

    private function authorizeOwnership(Request $request, Exam $exam): void
    {
        abort_unless(
            $exam->created_by === $request->user()->id,
            403,
            'Vous ne pouvez gérer que les devoirs que vous avez créés.'
        );
    }

    public function index(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $classIds = TimetableEntry::where('teacher_id', $teacher->id)->distinct()->pluck('school_class_id');

        $exams = Exam::whereIn('school_class_id', $classIds)
            ->whereIn('type', config('eeht.exam_category_devoir'))
            ->with('schoolClass:id,name', 'subject:id,name')
            ->orderByDesc('exam_date')
            ->paginate(15);

        $pairs = $this->classSubjectPairs($teacher);

        $exams->getCollection()->transform(function (Exam $exam) use ($request, $pairs) {
            $exam->is_mine = $exam->created_by === $request->user()->id;
            $exam->can_grade = $pairs->contains(
                fn ($p) => $p->school_class_id === $exam->school_class_id && $p->subject_id === $exam->subject_id
            );

            return $exam;
        });

        return Inertia::render('Portal/Teacher/Exams/Index', [
            'exams' => $exams,
            'types' => collect(Exam::TYPES)->only(config('eeht.exam_category_devoir')),
        ]);
    }

    private function formResponse(Request $request, ?Exam $exam = null): Response
    {
        $teacher = $this->teacher($request);

        return Inertia::render('Portal/Teacher/Exams/Form', [
            'exam' => $exam,
            'classSubjectPairs' => $this->classSubjectPairs($teacher)->map(fn ($e) => [
                'school_class_id' => $e->school_class_id,
                'subject_id' => $e->subject_id,
                'class_name' => $e->schoolClass->name,
                'subject_name' => $e->subject->name,
            ])->values(),
            'types' => collect(Exam::TYPES)->only(config('eeht.exam_category_devoir')),
            'terms' => config('eeht.terms'),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->formResponse($request);
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:'.implode(',', config('eeht.exam_category_devoir'))],
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'term' => ['nullable', 'string', 'max:100'],
            'exam_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'max_score' => ['required', 'numeric', 'min:1'],
            'coefficient' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function store(Request $request)
    {
        $teacher = $this->teacher($request);
        $data = $request->validate($this->rules());
        $this->authorizePair($teacher, (int) $data['school_class_id'], (int) $data['subject_id']);

        $currentYear = AcademicYear::where('is_current', true)->first();

        Exam::create([
            ...$data,
            'session' => 'normale',
            'academic_year_id' => $currentYear?->id,
            'is_published' => false,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('teacher.exams.index')->with('success', 'Devoir programmé avec succès.');
    }

    public function edit(Request $request, Exam $exam): Response
    {
        $this->authorizeOwnership($request, $exam);

        return $this->formResponse($request, $exam);
    }

    public function update(Request $request, Exam $exam)
    {
        $teacher = $this->teacher($request);
        $this->authorizeOwnership($request, $exam);

        $data = $request->validate($this->rules());
        $this->authorizePair($teacher, (int) $data['school_class_id'], (int) $data['subject_id']);

        $exam->update($data);

        return redirect()->route('teacher.exams.index')->with('success', 'Devoir mis à jour avec succès.');
    }

    public function destroy(Request $request, Exam $exam)
    {
        $this->authorizeOwnership($request, $exam);
        $exam->delete();

        return back()->with('success', 'Devoir supprimé.');
    }

    public function grades(Request $request, Exam $exam): Response
    {
        $teacher = $this->teacher($request);
        $this->authorizePair($teacher, $exam->school_class_id, $exam->subject_id);

        $students = Student::where('school_class_id', $exam->school_class_id)
            ->where('status', 'actif')
            ->orderBy('last_name')
            ->get(['id', 'matricule', 'first_name', 'last_name']);

        $grades = $exam->grades()->get()->keyBy('student_id');

        return Inertia::render('Portal/Teacher/Exams/Grades', [
            'exam' => $exam->load('schoolClass:id,name', 'subject:id,name'),
            'students' => $students,
            'grades' => $grades,
            'statuses' => Grade::STATUSES,
        ]);
    }

    public function storeGrades(Request $request, Exam $exam)
    {
        $teacher = $this->teacher($request);
        $this->authorizePair($teacher, $exam->school_class_id, $exam->subject_id);

        $data = $request->validate([
            'grades' => ['required', 'array'],
            'grades.*.student_id' => ['required', 'exists:students,id'],
            'grades.*.score' => ['nullable', 'numeric', 'min:0', 'max:'.$exam->max_score],
            'grades.*.status' => ['nullable', Rule::in(array_keys(Grade::STATUSES))],
            'grades.*.is_absent' => ['boolean'], // ancien format, avant les statuts
            'grades.*.comment' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($data['grades'] as $entry) {
            Grade::updateOrCreate(
                ['exam_id' => $exam->id, 'student_id' => $entry['student_id']],
                Grade::entryAttributes($entry, $request->user()->id)
            );
        }

        return back()->with('success', 'Notes enregistrées avec succès.');
    }
}

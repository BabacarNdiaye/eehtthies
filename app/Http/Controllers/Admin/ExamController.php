<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\Room;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExamController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Exam::with(['schoolClass:id,name', 'subject:id,name']);

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->integer('school_class_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        return Inertia::render('Admin/Exams/Index', [
            'exams' => $query->orderByDesc('exam_date')->paginate(15)->withQueryString(),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'types' => Exam::TYPES,
            'filters' => $request->only(['school_class_id', 'type']),
        ]);
    }

    private function formResponse(?Exam $exam = null): Response
    {
        return Inertia::render('Admin/Exams/Form', [
            'exam' => $exam?->load('invigilators:id,first_name,last_name'),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'teachers' => Teacher::orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'types' => Exam::TYPES,
            'terms' => config('eeht.terms'),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:'.implode(',', array_keys(Exam::TYPES))],
            'session' => ['required', 'in:normale,rattrapage'],
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'room_id' => ['nullable', 'exists:rooms,id'],
            'academic_year_id' => ['nullable', 'exists:academic_years,id'],
            'term' => ['nullable', 'string', 'max:100'],
            'exam_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'max_score' => ['required', 'numeric', 'min:1'],
            'coefficient' => ['required', 'numeric', 'min:0'],
            'is_published' => ['boolean'],
            'invigilator_ids' => ['nullable', 'array'],
            'invigilator_ids.*' => ['exists:teachers,id'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $invigilatorIds = $data['invigilator_ids'] ?? [];
        unset($data['invigilator_ids']);
        $data['created_by'] = $request->user()->id;

        $exam = Exam::create($data);
        $exam->invigilators()->sync($invigilatorIds);

        return redirect()->route('admin.exams.index')->with('success', 'Épreuve créée avec succès.');
    }

    public function edit(Exam $exam): Response
    {
        return $this->formResponse($exam);
    }

    public function update(Request $request, Exam $exam)
    {
        $data = $request->validate($this->rules());
        $invigilatorIds = $data['invigilator_ids'] ?? [];
        unset($data['invigilator_ids']);

        $exam->update($data);
        $exam->invigilators()->sync($invigilatorIds);

        return redirect()->route('admin.exams.index')->with('success', 'Épreuve mise à jour avec succès.');
    }

    public function destroy(Exam $exam)
    {
        $exam->delete();

        return back()->with('success', 'Épreuve supprimée.');
    }

    public function grades(Exam $exam): Response
    {
        $students = Student::where('school_class_id', $exam->school_class_id)
            ->where('status', 'actif')
            ->orderBy('last_name')
            ->get(['id', 'matricule', 'first_name', 'last_name']);

        $grades = $exam->grades()->get()->keyBy('student_id');

        return Inertia::render('Admin/Exams/Grades', [
            'exam' => $exam->load('schoolClass:id,name', 'subject:id,name'),
            'students' => $students,
            'grades' => $grades,
        ]);
    }

    public function storeGrades(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'grades' => ['required', 'array'],
            'grades.*.student_id' => ['required', 'exists:students,id'],
            'grades.*.score' => ['nullable', 'numeric', 'min:0', 'max:'.$exam->max_score],
            'grades.*.is_absent' => ['boolean'],
            'grades.*.comment' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach ($data['grades'] as $entry) {
            Grade::updateOrCreate(
                ['exam_id' => $exam->id, 'student_id' => $entry['student_id']],
                [
                    'score' => $entry['is_absent'] ?? false ? null : ($entry['score'] ?? null),
                    'is_absent' => $entry['is_absent'] ?? false,
                    'comment' => $entry['comment'] ?? null,
                    'entered_by' => $request->user()->id,
                ]
            );
        }

        return back()->with('success', 'Notes enregistrées avec succès.');
    }

    public function togglePublish(Exam $exam)
    {
        $exam->update(['is_published' => ! $exam->is_published]);

        return back()->with('success', $exam->is_published ? 'Résultats publiés.' : 'Résultats dépubliés.');
    }

    /**
     * Génère un PDF listant les épreuves et leurs notes selon les filtres (school_class_id, type).
     * URL: /admin/exams/pdf?school_class_id=123&type=devoir
     */
    public function pdf(Request $request)
    {
        $query = Exam::with(['schoolClass:id,name', 'subject:id,name', 'grades.student:id,first_name,last_name']);

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->integer('school_class_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        $exams = $query->orderByDesc('exam_date')->get();

        // Préparer les données: pour chaque épreuve, récupérer les élèves de la classe et les notes associées
        $payload = [];
        foreach ($exams as $exam) {
            $students = Student::where('school_class_id', $exam->school_class_id)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name']);

            $grades = $exam->grades()->get()->keyBy('student_id');

            $payload[] = [
                'exam' => $exam,
                'students' => $students,
                'grades' => $grades,
            ];
        }

        $schoolClass = null;
        if ($request->filled('school_class_id')) {
            $schoolClass = SchoolClass::find($request->integer('school_class_id'));
        }

        $pdf = Pdf::loadView('pdf.admin_exams', [
            'payload' => $payload,
            'schoolClass' => $schoolClass,
        ]);

        $filename = 'notes_'.($request->string('type') ?? 'toutes').'_'.($schoolClass->name ?? 'classe').'.pdf';

        return $pdf->stream($filename);
    }
}

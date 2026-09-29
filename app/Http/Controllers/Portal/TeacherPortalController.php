<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ClassMessage;
use App\Models\Exam;
use App\Models\InternalMessage;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeacherPortalController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    private function classIds(Teacher $teacher): array
    {
        return TimetableEntry::where('teacher_id', $teacher->id)->distinct()->pluck('school_class_id')->all();
    }

    public function dashboard(Request $request): Response
    {
        $teacher = $this->teacher($request)->load('subjects:id,name');
        $classIds = $this->classIds($teacher);

        $classes = SchoolClass::whereIn('id', $classIds)->withCount('students')->get(['id', 'name']);

        // Only exams whose (class, subject) actually matches this teacher's own
        // timetable — so "Saisir les notes" always leads somewhere they're
        // allowed to grade, instead of any exam merely happening in one of
        // their classes (possibly in a subject they don't teach there).
        $pairs = TimetableEntry::where('teacher_id', $teacher->id)
            ->get(['school_class_id', 'subject_id'])
            ->unique(fn ($e) => $e->school_class_id.'-'.$e->subject_id);

        $upcomingExams = $pairs->isEmpty()
            ? collect()
            : Exam::where('exam_date', '>=', now()->subDay())
                ->where(function ($query) use ($pairs) {
                    foreach ($pairs as $pair) {
                        $query->orWhere(function ($q) use ($pair) {
                            $q->where('school_class_id', $pair->school_class_id)
                                ->where('subject_id', $pair->subject_id);
                        });
                    }
                })
                ->with('schoolClass:id,name', 'subject:id,name')
                ->orderBy('exam_date')
                ->take(5)
                ->get();

        $entriesToday = TimetableEntry::where('teacher_id', $teacher->id)
            ->where('day_of_week', now()->dayOfWeekIso)
            ->with('schoolClass:id,name', 'subject:id,name', 'room:id,name')
            ->orderBy('start_time')
            ->get();

        return Inertia::render('Portal/Teacher/Dashboard', [
            'teacher' => $teacher,
            'classes' => $classes,
            'upcomingExams' => $upcomingExams,
            'entriesToday' => $entriesToday,
        ]);
    }

    public function classes(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $classIds = $this->classIds($teacher);

        $classes = SchoolClass::whereIn('id', $classIds)
            ->with(['formation:id,name', 'students' => fn ($q) => $q->where('status', 'actif')->orderBy('last_name')])
            ->get();

        return Inertia::render('Portal/Teacher/Classes', [
            'classes' => $classes,
        ]);
    }

    public function timetable(Request $request): Response
    {
        $teacher = $this->teacher($request);

        $entries = TimetableEntry::where('teacher_id', $teacher->id)
            ->with('schoolClass:id,name', 'subject:id,name', 'room:id,name')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return Inertia::render('Portal/Teacher/Timetable', [
            'entries' => $entries,
            'days' => TimetableEntry::DAYS,
        ]);
    }

    public function timetablePdf(Request $request)
    {
        $teacher = $this->teacher($request);

        $entries = TimetableEntry::where('teacher_id', $teacher->id)
            ->with('schoolClass:id,name', 'subject:id,name', 'room:id,name')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return Pdf::loadView('pdf.admin_timetable', [
            'entries' => $entries,
            'teacher' => $teacher,
            'days' => TimetableEntry::DAYS,
        ])->stream('emploi-du-temps.pdf');
    }

    public function messages(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $classIds = $this->classIds($teacher);

        return Inertia::render('Portal/Teacher/Messages', [
            'classes' => SchoolClass::whereIn('id', $classIds)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function sendToClass(Request $request)
    {
        $teacher = $this->teacher($request);
        $classIds = $this->classIds($teacher);

        $data = $request->validate([
            'school_class_ids' => ['required', 'array', 'min:1'],
            'school_class_ids.*' => ['exists:school_classes,id'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $selectedIds = array_map('intval', $data['school_class_ids']);

        abort_unless(
            empty(array_diff($selectedIds, $classIds)),
            403,
            "Vous n'enseignez pas dans une ou plusieurs des classes sélectionnées."
        );

        $students = Student::whereIn('school_class_id', $selectedIds)
            ->where('status', 'actif')
            ->whereNotNull('user_id')
            ->get(['id', 'user_id']);

        foreach ($students as $student) {
            InternalMessage::createQuietly([
                'sender_id' => $request->user()->id,
                'recipient_id' => $student->user_id,
                'subject' => $data['subject'],
                'body' => $data['body'],
            ]);
        }

        $withoutAccess = Student::whereIn('school_class_id', $selectedIds)
            ->where('status', 'actif')
            ->whereNull('user_id')
            ->count();

        $classWord = count($selectedIds) > 1 ? 'classes sélectionnées' : 'classe sélectionnée';
        $message = "{$students->count()} élève(s) de la {$classWord} ont reçu le message.";
        if ($withoutAccess > 0) {
            $message .= " {$withoutAccess} élève(s) n'ont pas encore d'accès à leur espace et n'ont rien reçu.";
        }

        return back()->with('success', $message);
    }

    private function authorizeClass(Teacher $teacher, int $schoolClassId): void
    {
        abort_unless(in_array($schoolClassId, $this->classIds($teacher), true), 403, "Vous n'enseignez pas dans cette classe.");
    }

    public function classDiscussion(Request $request, SchoolClass $schoolClass): Response
    {
        $teacher = $this->teacher($request);
        $this->authorizeClass($teacher, $schoolClass->id);

        return Inertia::render('Portal/Teacher/ClassDiscussion', [
            'schoolClass' => $schoolClass->only('id', 'name'),
            'classes' => SchoolClass::whereIn('id', $this->classIds($teacher))->orderBy('name')->get(['id', 'name']),
            'messages' => ClassMessage::where('school_class_id', $schoolClass->id)
                ->with('user:id,name')
                ->orderBy('created_at')
                ->get(),
        ]);
    }

    public function classMessagesJson(Request $request, SchoolClass $schoolClass)
    {
        $this->authorizeClass($this->teacher($request), $schoolClass->id);

        $messages = ClassMessage::where('school_class_id', $schoolClass->id)
            ->with('user:id,name')
            ->orderBy('created_at')
            ->get();

        return response()->json(['messages' => $messages]);
    }

    public function storeClassMessage(Request $request, SchoolClass $schoolClass)
    {
        $this->authorizeClass($this->teacher($request), $schoolClass->id);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = ClassMessage::create([
            'school_class_id' => $schoolClass->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ])->load('user:id,name');

        return response()->json(['message' => $message]);
    }
}

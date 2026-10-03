<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Services\PortalFeed;
use App\Support\ClassSchedule;
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

    public function dashboard(Request $request, PortalFeed $feed): Response
    {
        $teacher = $this->teacher($request)->load('subjects:id,name');
        $classIds = $this->classIds($teacher);

        $classes = SchoolClass::whereIn('id', $classIds)->withCount('students')->get(['id', 'name']);

        // Uniquement les examens dont le couple (classe, matière) correspond à l'emploi du temps de
        // l'enseignant — ainsi « Saisir les notes » mène toujours là où la saisie lui est permise, et pas
        // vers n'importe quel examen simplement organisé dans l'une de ses classes (possiblement dans une
        // matière qu'il n'y enseigne pas).
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

        $weekEntries = TimetableEntry::where('teacher_id', $teacher->id)
            ->with('schoolClass:id,name', 'subject:id,name', 'room:id,name')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return Inertia::render('Portal/Teacher/Dashboard', [
            'teacher' => $teacher,
            'classes' => $classes,
            'upcomingExams' => $upcomingExams,
            'entriesToday' => $entriesToday,
            'weekEntries' => $weekEntries,
            'nextClass' => ClassSchedule::next($weekEntries, now()),
            'announcements' => $feed->forUser($request->user()),
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

    private function authorizeClass(Teacher $teacher, int $schoolClassId): void
    {
        abort_unless(in_array($schoolClassId, $this->classIds($teacher), true), 403, "Vous n'enseignez pas dans cette classe.");
    }
}

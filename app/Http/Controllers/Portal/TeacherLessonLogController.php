<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\LessonLog;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/** Lets a teacher fill their own cahier de texte, one entry per timetable session. */
class TeacherLessonLogController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    public function index(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $date = $request->string('date')->toString() ?: now()->toDateString();
        $dayOfWeek = Carbon::parse($date)->dayOfWeekIso;

        $entries = TimetableEntry::where('teacher_id', $teacher->id)
            ->where('day_of_week', $dayOfWeek)
            ->with('schoolClass:id,name', 'subject:id,name', 'room:id,name')
            ->orderBy('start_time')
            ->get();

        $logs = LessonLog::where('teacher_id', $teacher->id)
            ->where('date', $date)
            ->get()
            ->keyBy('timetable_entry_id');

        return Inertia::render('Portal/Teacher/LessonLog', [
            'entries' => $entries,
            'logs' => $logs,
            'date' => $date,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = $this->teacher($request);

        $data = $request->validate([
            'timetable_entry_id' => ['required', 'exists:timetable_entries,id'],
            'date' => ['required', 'date'],
            'content' => ['required', 'string', 'max:5000'],
            'homework' => ['nullable', 'string', 'max:2000'],
        ]);

        $entry = TimetableEntry::where('id', $data['timetable_entry_id'])
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        abort_unless(
            Carbon::parse($data['date'])->dayOfWeekIso === $entry->day_of_week,
            422,
            'La date ne correspond pas au jour de ce créneau.'
        );

        LessonLog::updateOrCreate(
            ['timetable_entry_id' => $entry->id, 'date' => $data['date']],
            [
                'teacher_id' => $teacher->id,
                'school_class_id' => $entry->school_class_id,
                'subject_id' => $entry->subject_id,
                'content' => $data['content'],
                'homework' => $data['homework'] ?? null,
            ]
        );

        return back()->with('success', 'Séance enregistrée dans le cahier de texte.');
    }
}

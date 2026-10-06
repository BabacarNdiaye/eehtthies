<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TimetableController extends Controller
{
    public function index(Request $request): Response
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;

        $entries = collect();
        if ($schoolClassId) {
            $entries = TimetableEntry::where('school_class_id', $schoolClassId)
                ->with(['subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name'])
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get();
        }

        return Inertia::render('Admin/Timetable/Index', [
            'schoolClasses' => SchoolClass::with('formation:id,name')->orderBy('name')->get(['id', 'name', 'formation_id']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'teachers' => Teacher::orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'entries' => $entries,
            'selectedClassId' => $schoolClassId,
            'days' => TimetableEntry::DAYS,
        ]);
    }

    private function rules(): array
    {
        return [
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'room_id' => ['nullable', 'exists:rooms,id'],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ];
    }

    private function assertNoConflict(array $data, ?int $ignoreId = null): void
    {
        $overlap = fn ($query) => $query
            ->where('day_of_week', $data['day_of_week'])
            ->where('start_time', '<', $data['end_time'])
            ->where('end_time', '>', $data['start_time'])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId));

        if ($overlap(TimetableEntry::where('school_class_id', $data['school_class_id']))->exists()) {
            throw ValidationException::withMessages([
                'day_of_week' => 'Cette classe a déjà un cours programmé sur ce créneau.',
            ]);
        }

        if (! empty($data['teacher_id']) && $overlap(TimetableEntry::where('teacher_id', $data['teacher_id']))->exists()) {
            throw ValidationException::withMessages([
                'teacher_id' => 'Cet enseignant est déjà occupé sur ce créneau.',
            ]);
        }

        if (! empty($data['room_id']) && $overlap(TimetableEntry::where('room_id', $data['room_id']))->exists()) {
            throw ValidationException::withMessages([
                'room_id' => 'Cette salle est déjà occupée sur ce créneau.',
            ]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $this->assertNoConflict($data);

        TimetableEntry::create($data);

        return back()->with('success', 'Créneau ajouté à l\'emploi du temps.');
    }

    public function update(Request $request, TimetableEntry $timetable)
    {
        $data = $request->validate($this->rules());
        $this->assertNoConflict($data, $timetable->id);

        $timetable->update($data);

        return back()->with('success', 'Créneau mis à jour avec succès.');
    }

    public function destroy(TimetableEntry $timetable)
    {
        $timetable->delete();

        return back()->with('success', 'Créneau supprimé.');
    }

    /**
     * Génère un PDF de l'emploi du temps pour une classe sélectionnée.
     * URL: /admin/timetable/pdf?school_class_id=123
     */
    public function pdf(Request $request)
    {
        $schoolClassId = $request->integer('school_class_id');
        abort_unless($schoolClassId && SchoolClass::where('id', $schoolClassId)->exists(), 404);

        $entries = TimetableEntry::where('school_class_id', $schoolClassId)
            ->with(['subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $schoolClass = SchoolClass::find($schoolClassId);

        $pdf = Pdf::loadView('pdf.admin_timetable', [
            'entries' => $entries,
            'schoolClass' => $schoolClass,
            'days' => TimetableEntry::DAYS,
        ]);

        $filename = 'emploi_du_temps_'.preg_replace('/[^A-Za-z0-9-_]/', '_', ($schoolClass->name ?? $schoolClassId)).'.pdf';

        return $pdf->stream($filename);
    }
}

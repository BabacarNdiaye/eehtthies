<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AppreciationTemplate;
use App\Models\Council;
use App\Models\CouncilObservation;
use App\Models\CouncilStudent;
use App\Models\Teacher;
use App\Services\Council\PreCouncilService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Saisie du pré-conseil par l'enseignant (E04) : élèves en lignes, ses matières, enregistrement automatique ; sur
 * téléphone, une fiche par élève. Le professeur principal voit en plus l'avancement de chaque collègue (PRE-04).
 */
class TeacherPreCouncilController extends Controller
{
    public function __construct(private readonly PreCouncilService $preCouncil) {}

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $teacher = $this->teacher($request);
        $council->load(['schoolClass:id,name', 'academicYear:id,label']);
        $subjects = $this->preCouncil->subjectsOf($teacher, $council);

        $rows = $council->students()->with('student:id,first_name,last_name,matricule')->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))->values();

        $observations = CouncilObservation::where('council_id', $council->id)->whereIn('subject_id', $subjects->pluck('id'))->get()
            ->mapWithKeys(fn (CouncilObservation $observation) => ["{$observation->council_student_id}-{$observation->subject_id}" => $this->preCouncil->present($observation, true)]);

        return Inertia::render('Portal/Teacher/Councils/PreCouncil', [
            'council' => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'status_label' => $council->status_label,
                'deadline' => $council->preconseil_deadline?->toIso8601String(),
            ],
            'open' => $this->preCouncil->isOpen($council),
            'subjects' => $subjects->map(fn ($subject) => ['id' => $subject->id, 'name' => $subject->name])->values(),
            'students' => $rows->map(fn (CouncilStudent $row) => [
                'id' => $row->id,
                'name' => $row->student?->full_name,
                'matricule' => $row->student?->matricule,
                'has_left_class' => $row->has_left_class,
                // Moyenne de l'élève dans chaque matière de l'enseignant, d'après la photo.
                'averages' => collect($row->snapshot['subjects'] ?? [])->whereIn('id', $subjects->pluck('id'))->mapWithKeys(fn ($subject) => [$subject['id'] => $subject['moy20']])->all(),
            ]),
            'observations' => $observations,
            'difficulties' => CouncilObservation::DIFFICULTIES,
            'bank' => AppreciationTemplate::bank(),
            'levels' => AppreciationTemplate::LEVELS,
            'themes' => AppreciationTemplate::THEMES,
            'progress' => $council->main_teacher_id === $request->user()->id ? $this->preCouncil->progress($council) : null,
        ]);
    }

    public function save(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('view', $council);
        $teacher = $this->teacher($request);

        $data = $request->validate([
            'entries' => ['required', 'array', 'max:400'],
            'entries.*.council_student_id' => ['required', 'integer'],
            'entries.*.subject_id' => ['required', 'integer'],
            'entries.*.appreciation' => ['nullable', 'string', 'max:2000'],
            'entries.*.internal_note' => ['nullable', 'string', 'max:2000'],
            'entries.*.difficulty' => ['nullable', 'string', 'max:30'],
            'entries.*.recommendation' => ['nullable', 'string', 'max:2000'],
            'entries.*.revision' => ['nullable', 'integer'],
        ]);

        $result = $this->preCouncil->save($council, $teacher, $request->user(), $data['entries']);

        return response()->json($result + ['saved_at' => now()->toIso8601String()], $result['conflicts'] === [] ? 200 : 409);
    }
}

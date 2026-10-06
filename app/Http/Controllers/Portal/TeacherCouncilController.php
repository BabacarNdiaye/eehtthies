<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\DecisionType;
use App\Models\User;
use App\Services\Council\CouncilWorkflow;
use App\Services\Council\PreCouncilService;
use App\Support\CouncilLock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Les conseils de classe vus de l'espace enseignant : ceux où l'enseignant siège, et pour le professeur principal la
 * synthèse et la recommandation de décision par élève (PRE-05), utilisables au téléphone.
 */
class TeacherCouncilController extends Controller
{
    private function councilsOf(User $user): Builder
    {
        return Council::query()->where(fn (Builder $query) => $query
            ->where('president_id', $user->id)
            ->orWhere('main_teacher_id', $user->id)
            ->orWhere('secretary_id', $user->id)
            ->orWhereHas('members', fn (Builder $members) => $members->where('user_id', $user->id)));
    }

    private function functionOf(User $user, Council $council): string
    {
        foreach (['president', 'main_teacher', 'secretary'] as $function) {
            if ($council->{$function.'_id'} === $user->id) {
                return $function;
            }
        }

        return $council->members->firstWhere('user_id', $user->id)?->function ?? 'teacher';
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $councils = $this->councilsOf($user)
            ->with(['schoolClass:id,name', 'academicYear:id,label', 'members:id,council_id,user_id,function'])
            ->orderByDesc('scheduled_at')
            ->get()
            ->map(fn (Council $council) => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'scheduled_at' => $council->scheduled_at?->toIso8601String(),
                'room' => $council->room,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'function_label' => CouncilMember::FUNCTIONS[$this->functionOf($user, $council)] ?? '',
            ]);

        return Inertia::render('Portal/Teacher/Councils/Index', ['councils' => $councils]);
    }

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $council->load(['schoolClass:id,name', 'academicYear:id,label', 'members:id,council_id,user_id,function']);

        $canWrite = Gate::allows('writeSynthesis', $council) && in_array($council->status, [Council::DRAFT, Council::SCHEDULED], true);
        $isMainTeacher = $council->main_teacher_id === $request->user()->id;
        $teacher = $request->user()->teacher;
        $preCouncil = app(PreCouncilService::class);
        $subjects = $teacher ? $preCouncil->subjectsOf($teacher, $council) : collect();

        return Inertia::render('Portal/Teacher/Councils/Show', [
            'council' => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'scheduled_at' => $council->scheduled_at?->toIso8601String(),
                'room' => $council->room,
                'agenda' => $council->agenda,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'is_end_of_year' => $council->is_end_of_year,
                'function_label' => CouncilMember::FUNCTIONS[$this->functionOf($request->user(), $council)] ?? '',
            ],
            'students' => $council->students()->with('student:id,first_name,last_name,matricule')->get()
                ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))
                ->values()
                ->map(fn (CouncilStudent $row) => [
                    'id' => $row->id,
                    'name' => $row->student?->full_name,
                    'matricule' => $row->student?->matricule,
                    'average' => $row->general_average,
                    'rank' => $row->rank,
                    'alert_level' => $row->alert_level,
                    'has_left_class' => $row->has_left_class,
                    // La synthèse n'est montrée qu'à qui la rédige : un simple membre ne lit pas celle de ses collègues ici.
                    'summary' => $isMainTeacher || $canWrite ? $row->main_teacher_summary : null,
                    'recommendation_id' => $isMainTeacher || $canWrite ? $row->main_teacher_recommendation_id : null,
                    'revision' => $row->revision,
                ]),
            'canWriteSynthesis' => $canWrite,
            // E04 : lien vers la saisie du pré-conseil, pour un enseignant qui a cours dans la classe.
            'preCouncil' => $subjects->isEmpty() ? null : [
                'open' => $preCouncil->isOpen($council),
                'deadline' => $council->preconseil_deadline?->toIso8601String(),
                'subjects' => $subjects->pluck('name')->values(),
            ],
            'decisionTypes' => DecisionType::active()->ordered()
                ->when(! $council->is_end_of_year, fn (Builder $query) => $query->where('is_end_of_year_only', false))
                ->get(['id', 'label', 'category'])
                ->map(fn (DecisionType $type) => ['id' => $type->id, 'label' => $type->label, 'category' => DecisionType::CATEGORIES[$type->category] ?? $type->category]),
        ]);
    }

    /**
     * Enregistrement automatique de la synthèse d'un élève (JSON). Verrou optimiste (ENF-08) : si la ligne a changé
     * depuis l'ouverture de la page, réponse 409 avec la version en base.
     */
    public function updateSynthesis(Request $request, Council $council, CouncilStudent $councilStudent): JsonResponse
    {
        abort_unless($councilStudent->council_id === $council->id, 404);
        Gate::authorize('writeSynthesis', $council);
        CouncilLock::assertStatus($council, Council::DRAFT, Council::SCHEDULED);

        $data = $request->validate([
            'summary' => ['nullable', 'string', 'max:3000'],
            'recommendation_id' => ['nullable', 'integer', Rule::exists('decision_types', 'id')->where('is_active', true)],
            'revision' => ['required', 'integer'],
        ]);

        if ((int) $data['revision'] !== $councilStudent->revision) {
            return response()->json([
                'message' => 'Cette fiche a été modifiée entre-temps par quelqu’un d’autre : voici la version enregistrée.',
                'code' => 'STALE',
                'current' => [
                    'summary' => $councilStudent->main_teacher_summary,
                    'recommendation_id' => $councilStudent->main_teacher_recommendation_id,
                    'revision' => $councilStudent->revision,
                ],
            ], 409);
        }

        $before = ['summary' => $councilStudent->main_teacher_summary, 'recommendation_id' => $councilStudent->main_teacher_recommendation_id];
        $councilStudent->update([
            'main_teacher_summary' => $data['summary'] ?? null,
            'main_teacher_recommendation_id' => $data['recommendation_id'] ?? null,
            'revision' => $councilStudent->revision + 1,
        ]);

        CouncilWorkflow::log($council, $request->user(), 'Synthèse du professeur principal enregistrée', [
            'student_id' => $councilStudent->student_id,
            'old' => $before,
            'new' => ['summary' => $councilStudent->main_teacher_summary, 'recommendation_id' => $councilStudent->main_teacher_recommendation_id],
        ]);

        return response()->json(['revision' => $councilStudent->revision, 'saved_at' => now()->toIso8601String()]);
    }
}

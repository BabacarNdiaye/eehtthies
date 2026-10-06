<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Council;
use App\Models\CouncilInternshipEvaluation;
use App\Models\CouncilStudent;
use App\Models\InternshipCriterion;
use App\Services\Council\CouncilWorkflow;
use App\Support\CouncilLock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Évaluation de stage pour le conseil (PRE-06) : la grille (PAR-07) est renseignée par le personnel des stages
 * (`modifier_insertion`), d'après l'avis du tuteur, jusqu'à la clôture du conseil.
 */
class CouncilInternshipController extends Controller
{
    private function canWrite(Request $request, Council $council): bool
    {
        return EnsureUserIsStaff::isStaff($request->user()) && $request->user()->can('modifier_insertion') && ! $council->isClosed();
    }

    public function show(Request $request, Council $council): Response
    {
        // Le personnel des stages renseigne la grille sans forcément voir le reste du conseil.
        abort_unless(Gate::allows('view', $council) || (EnsureUserIsStaff::isStaff($request->user()) && $request->user()->can('voir_insertion')), 403);
        $council->load(['schoolClass:id,name']);
        $criteria = InternshipCriterion::active()->get(['id', 'label']);
        $evaluations = CouncilInternshipEvaluation::where('council_id', $council->id)->get()->groupBy('council_student_id');

        return Inertia::render('Admin/Councils/Internship', [
            'council' => ['id' => $council->id, 'class' => $council->schoolClass?->name, 'term' => $council->term, 'status_label' => $council->status_label],
            'criteria' => $criteria,
            'ratings' => CouncilInternshipEvaluation::RATINGS,
            'students' => $council->students()->with('student:id,first_name,last_name,matricule')->get()
                ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))->values()
                ->map(function (CouncilStudent $row) use ($evaluations) {
                    $rows = $evaluations->get($row->id, collect());

                    return [
                        'id' => $row->id,
                        'name' => $row->student?->full_name,
                        'internship' => $row->snapshot['internship'] ?? null,
                        'company_name' => $rows->first()?->company_name ?? ($row->snapshot['internship']['company'] ?? null),
                        'tutor_name' => $rows->first()?->tutor_name,
                        'ratings' => $rows->mapWithKeys(fn (CouncilInternshipEvaluation $evaluation) => [$evaluation->criterion_id => ['rating' => $evaluation->rating, 'comment' => $evaluation->comment]])->all(),
                    ];
                }),
            'canWrite' => $this->canWrite($request, $council),
        ]);
    }

    public function save(Request $request, Council $council, CouncilStudent $councilStudent)
    {
        abort_unless($councilStudent->council_id === $council->id, 404);
        abort_unless($this->canWrite($request, $council), 403);
        CouncilLock::assertWritable($council);

        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:160'],
            'tutor_name' => ['nullable', 'string', 'max:160'],
            'ratings' => ['nullable', 'array'],
            'ratings.*.rating' => ['nullable', Rule::in(array_keys(CouncilInternshipEvaluation::RATINGS))],
            'ratings.*.comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $criteria = InternshipCriterion::active()->pluck('id');

        DB::transaction(function () use ($data, $criteria, $council, $councilStudent, $request) {
            foreach ($criteria as $criterionId) {
                $values = $data['ratings'][$criterionId] ?? [];

                CouncilInternshipEvaluation::updateOrCreate(
                    ['council_student_id' => $councilStudent->id, 'criterion_id' => $criterionId],
                    [
                        'council_id' => $council->id,
                        'company_name' => $data['company_name'] ?? null,
                        'tutor_name' => $data['tutor_name'] ?? null,
                        'rating' => $values['rating'] ?? null,
                        'comment' => $values['comment'] ?? null,
                        'recorded_by' => $request->user()->id,
                    ]
                );
            }

            CouncilWorkflow::log($council, $request->user(), 'Évaluation de stage enregistrée', ['student_id' => $councilStudent->student_id, 'new' => $data]);
        });

        return back()->with('success', 'Évaluation de stage enregistrée.');
    }
}

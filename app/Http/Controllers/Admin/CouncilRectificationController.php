<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Council;
use App\Models\CouncilAppeal;
use App\Models\CouncilDecision;
use App\Models\CouncilStudent;
use App\Services\Council\RectificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Rectification (Direction) et recours des familles sur un conseil clôturé (REC-01 à REC-03). */
class CouncilRectificationController extends Controller
{
    public function __construct(private readonly RectificationService $service) {}

    public function rectify(Request $request, Council $council, CouncilStudent $councilStudent)
    {
        abort_unless($councilStudent->council_id === $council->id, 404);
        Gate::authorize('validateDirection', $council);

        $data = $request->validate([
            'decisions' => ['nullable', 'array', 'max:12'],
            'decisions.*.decision_type_id' => ['required', 'integer'],
            'decisions.*.reason' => ['nullable', 'string', 'max:1000'],
            'general_appreciation' => ['nullable', 'string', 'max:3000'],
            'reason' => ['required', 'string', 'max:2000'],
        ], ['reason.required' => 'Le motif de la rectification est obligatoire.']);

        $this->service->rectify($council, $councilStudent, $data['decisions'] ?? [], $data['general_appreciation'] ?? null, $data['reason'], $request->user());

        return back()->with('success', 'Décision rectifiée : une nouvelle version du procès-verbal est générée.');
    }

    public function fileAppeal(Request $request, Council $council, CouncilDecision $decision)
    {
        abort_unless($decision->council_id === $council->id, 404);
        $user = $request->user();
        abort_unless(EnsureUserIsStaff::isStaff($user) && ($user->can('modifier_conseils') || $user->can('valider_conseils_direction')), 403);

        $data = $request->validate([
            'filed_at' => ['required', 'date', 'before_or_equal:today'],
            'filed_by_name' => ['required', 'string', 'max:160'],
            'reason' => ['required', 'string', 'max:3000'],
        ]);

        $this->service->fileAppeal($council, $decision, Carbon::parse($data['filed_at']), $data['filed_by_name'], $data['reason'], $user);

        return back()->with('success', 'Recours enregistré : la décision est provisoire jusqu’à sa réponse.');
    }

    public function decideAppeal(Request $request, CouncilAppeal $appeal)
    {
        Gate::authorize('validateDirection', $appeal->council);

        $data = $request->validate([
            'outcome' => ['required', Rule::in(['upheld', 'modified'])],
            'decision_type_id' => ['nullable', 'integer', 'required_if:outcome,modified'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $this->service->decideAppeal($appeal, $data['outcome'], $data['decision_type_id'] ?? null, $data['comment'] ?? null, $request->user());

        return back()->with('success', $data['outcome'] === 'upheld' ? 'Recours rejeté : la décision est maintenue.' : 'Recours accepté : la décision est modifiée.');
    }
}

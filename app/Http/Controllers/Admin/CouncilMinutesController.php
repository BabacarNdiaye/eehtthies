<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\CouncilMinute;
use App\Models\CouncilValidation;
use App\Services\Council\CouncilValidationFlow;
use App\Services\Council\CouncilWorkflow;
use App\Services\Council\MinutesService;
use App\Support\CouncilSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Procès-verbal et validation (E07) : observations générales, soumission, validations, renvoi, clôture, téléchargement
 * des versions (disque privé, route authentifiée, liens signés 15 min), PV signé scanné. Chaque téléchargement est tracé.
 */
class CouncilMinutesController extends Controller
{
    public function __construct(private readonly CouncilValidationFlow $flow, private readonly MinutesService $minutes) {}

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $council->load(['schoolClass:id,name', 'academicYear:id,label']);
        $user = $request->user();

        return Inertia::render('Admin/Councils/Minutes', [
            'council' => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'general_observations' => $council->general_observations,
                'recommendations' => $council->recommendations,
                'closed_at' => $council->closed_at?->toIso8601String(),
            ],
            'doubleValidation' => CouncilSettings::doubleValidation(),
            'validations' => $council->validations()->with('user:id,name')->get()->map(fn (CouncilValidation $validation) => [
                'id' => $validation->id,
                'step' => CouncilValidation::STEPS[$validation->step] ?? $validation->step,
                'action' => $validation->action,
                'action_label' => CouncilValidation::ACTIONS[$validation->action] ?? $validation->action,
                'user' => $validation->user?->name,
                'comment' => $validation->comment,
                'acted_at' => $validation->acted_at->toIso8601String(),
            ]),
            'versions' => $council->minutes()->with('generator:id,name')->get()->map(fn (CouncilMinute $minute) => [
                'id' => $minute->id,
                'version' => $minute->version,
                'number' => $minute->number,
                'sha256' => $minute->sha256,
                'generated_at' => $minute->generated_at->toIso8601String(),
                'generated_by' => $minute->generator?->name,
                'rectification_reason' => $minute->rectification_reason,
                'has_scan' => $minute->signed_scan_path !== null,
            ]),
            'can' => [
                'edit' => Gate::allows('submit', $council) && $council->status === Council::DRAFTING_MINUTES,
                'submit' => Gate::allows('submit', $council) && $council->status === Council::DRAFTING_MINUTES,
                // La validation pédagogique n'est proposée qu'une fois par soumission.
                'validatePedagogical' => Gate::allows('validatePedagogical', $council) && $council->status === Council::PENDING_VALIDATION
                    && ! $council->validations()->where('id', '>', (int) $council->validations()->where('action', 'submitted')->max('id'))->where('step', 'pedagogical')->where('action', 'approved')->exists(),
                'return' => (Gate::allows('validatePedagogical', $council) || Gate::allows('validateDirection', $council)) && $council->status === Council::PENDING_VALIDATION,
                'close' => Gate::allows('validateDirection', $council) && $council->status === Council::PENDING_VALIDATION,
                'export' => Gate::allows('export', $council),
                'draft' => $user->can('export', $council) || $user->can('submit', $council) || $user->can('validatePedagogical', $council),
            ],
        ]);
    }

    public function draft(Request $request, Council $council)
    {
        abort_unless($request->user()->can('export', $council) || $request->user()->can('submit', $council) || $request->user()->can('validatePedagogical', $council), 403);

        return $this->minutes->draftPdf($council)->stream("pv-brouillon-{$council->id}.pdf");
    }

    public function saveObservations(Request $request, Council $council)
    {
        Gate::authorize('submit', $council);
        $data = $request->validate([
            'general_observations' => ['nullable', 'string', 'max:6000'],
            'recommendations' => ['nullable', 'string', 'max:6000'],
        ]);

        $this->flow->saveObservations($council, $data['general_observations'] ?? null, $data['recommendations'] ?? null, $request->user());

        return back()->with('success', 'Observations enregistrées.');
    }

    public function submit(Request $request, Council $council)
    {
        Gate::authorize('submit', $council);
        $this->flow->submit($council, $request->user());

        return back()->with('success', 'Procès-verbal soumis à validation.');
    }

    public function validatePedagogical(Request $request, Council $council)
    {
        Gate::authorize('validatePedagogical', $council);
        $this->flow->approvePedagogical($council, $request->user(), $request->string('comment')->toString());

        return back()->with('success', 'Procès-verbal validé.');
    }

    public function returnToDrafting(Request $request, Council $council)
    {
        $user = $request->user();
        abort_unless($user->can('validatePedagogical', $council) || $user->can('validateDirection', $council), 403);

        $step = $user->can('validateDirection', $council) ? 'direction' : 'pedagogical';
        $this->flow->returnToDrafting($council, $user, $step, $request->string('comment')->toString());

        return back()->with('success', 'Procès-verbal renvoyé en rédaction.');
    }

    public function close(Request $request, Council $council)
    {
        Gate::authorize('validateDirection', $council);
        $this->flow->close($council, $request->user(), $request->string('comment')->toString());

        return back()->with('success', 'Conseil clôturé : le procès-verbal définitif est généré et verrouillé.');
    }

    private function belongs(Council $council, CouncilMinute $minute): void
    {
        abort_unless($minute->council_id === $council->id, 404);
    }

    private function stream(CouncilMinute $minute, Request $request, string $path, string $name): StreamedResponse
    {
        $disk = Storage::disk(CouncilMinute::DISK);
        abort_unless($disk->exists($path), 404);

        CouncilWorkflow::log($minute->council, $request->user(), "Procès-verbal {$minute->number} v{$minute->version} téléchargé", ['minute_id' => $minute->id]);

        return $disk->download($path, $name);
    }

    public function download(Request $request, Council $council, CouncilMinute $minute): StreamedResponse
    {
        $this->belongs($council, $minute);
        Gate::authorize('export', $council);

        return $this->stream($minute, $request, $minute->file_path, "{$minute->number}-v{$minute->version}.pdf");
    }

    /** Lien de partage valable 15 minutes (ENF-03) : il exige aussi d'être connecté avec le droit d'exporter. */
    public function link(Request $request, Council $council, CouncilMinute $minute): JsonResponse
    {
        $this->belongs($council, $minute);
        Gate::authorize('export', $council);

        return response()->json(['url' => URL::temporarySignedRoute('admin.councils.minutes.shared', now()->addMinutes(15), ['minute' => $minute->id])]);
    }

    public function shared(Request $request, CouncilMinute $minute): StreamedResponse
    {
        Gate::authorize('export', $minute->council);

        return $this->stream($minute, $request, $minute->file_path, "{$minute->number}-v{$minute->version}.pdf");
    }

    /** PV-05 : le PV signé à la main puis scanné, joint à sa version. */
    public function uploadScan(Request $request, Council $council, CouncilMinute $minute)
    {
        $this->belongs($council, $minute);
        abort_unless($request->user()->can('export', $council) || $request->user()->can('validateDirection', $council), 403);

        $data = $request->validate(['scan' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240']], [
            'scan.mimes' => 'Le PV signé doit être un PDF ou une image (JPG, PNG).',
            'scan.max' => 'Le fichier dépasse 10 Mo.',
        ]);

        $path = $data['scan']->storeAs("councils/{$council->id}", "pv-v{$minute->version}-signe.".$data['scan']->extension(), CouncilMinute::DISK);
        $minute->update(['signed_scan_path' => $path, 'signed_scan_uploaded_at' => now()]);
        CouncilWorkflow::log($council, $request->user(), "PV signé joint à la version {$minute->version}");

        return back()->with('success', 'PV signé joint.');
    }

    public function downloadScan(Request $request, Council $council, CouncilMinute $minute): StreamedResponse
    {
        $this->belongs($council, $minute);
        Gate::authorize('export', $council);
        abort_unless($minute->signed_scan_path !== null, 404);

        return $this->stream($minute, $request, $minute->signed_scan_path, "{$minute->number}-v{$minute->version}-signe.".pathinfo($minute->signed_scan_path, PATHINFO_EXTENSION));
    }
}

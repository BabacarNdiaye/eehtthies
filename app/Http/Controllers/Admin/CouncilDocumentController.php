<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CouncilException;
use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Services\Council\CouncilDocuments;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Documents imprimables du conseil, convocations et duplication (CRE-07, CRE-08, §7.1). */
class CouncilDocumentController extends Controller
{
    public function __construct(private readonly CouncilDocuments $documents) {}

    public function convocation(Council $council)
    {
        Gate::authorize('view', $council);

        return $this->documents->convocation($council)->stream("convocation-conseil-{$council->id}.pdf");
    }

    /** Fiche préparatoire : document interne (observations internes, sanctions). */
    public function preparatory(Council $council)
    {
        Gate::authorize('viewInternal', $council);

        return $this->documents->preparatory($council)->stream("fiche-preparatoire-{$council->id}.pdf");
    }

    public function decisionRecord(Council $council, CouncilStudent $councilStudent)
    {
        abort_unless($councilStudent->council_id === $council->id, 404);
        Gate::authorize('export', $council);
        abort_unless($council->isClosed(), 404);

        return $this->documents->decisionRecord($council, $councilStudent)->stream("releve-decisions-{$councilStudent->student_id}.pdf");
    }

    public function sendConvocations(Request $request, Council $council)
    {
        Gate::authorize('schedule', $council);
        $count = $this->documents->sendConvocations($council, $request->user());

        return back()->with('success', "Convocation envoyée à {$count} membre(s) disposant d’un compte.");
    }

    /** CRE-07 : un nouveau conseil en brouillon pour une autre période, avec les mêmes membres. */
    public function duplicate(Request $request, Council $council, CouncilWorkflow $workflow)
    {
        Gate::authorize('create', Council::class);
        $data = $request->validate(['term' => ['required', Rule::in(config('eeht.terms'))]]);

        $members = $council->members()->whereNotIn('function', ['president', 'main_teacher', 'secretary'])->get()
            ->map(fn (CouncilMember $member) => $member->only(['user_id', 'teacher_id', 'external_name', 'external_role', 'function', 'can_vote']))->all();

        try {
            $copy = $workflow->create([
                'academic_year_id' => $council->academic_year_id,
                'school_class_id' => $council->school_class_id,
                'term' => $data['term'],
                'is_end_of_year' => $data['term'] === last(config('eeht.terms')),
                'room' => $council->room,
                'agenda' => $council->agenda,
                'president_id' => $council->president_id,
                'main_teacher_id' => $council->main_teacher_id,
                'secretary_id' => $council->secretary_id,
            ], $members, $request->user());
        } catch (CouncilException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('admin.councils.edit', $copy)->with('success', 'Conseil dupliqué : fixez sa date puis programmez-le.');
    }
}

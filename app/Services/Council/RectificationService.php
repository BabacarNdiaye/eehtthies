<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilAppeal;
use App\Models\CouncilDecision;
use App\Models\CouncilStudent;
use App\Models\DecisionType;
use App\Models\User;
use App\Support\CouncilLock;
use App\Support\CouncilSettings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Après la clôture (REC-01 à REC-03, RG-19, RG-20) :
 *  - rectification par la Direction : motif obligatoire, anciennes décisions gardées (statut « rectifiée », remplacée
 *    par la nouvelle), nouvelle version du PV ; les versions précédentes restent consultables ;
 *  - recours d'une famille contre une décision d'orientation, dans le délai réglé après la notification (la clôture) :
 *    la décision devient provisoire jusqu'à l'issue (maintenue, ou modifiée par rectification).
 */
class RectificationService
{
    public function __construct(
        private readonly DecisionRulesService $rules,
        private readonly MinutesService $minutes,
        private readonly ReportCardSync $reportCards,
        private readonly FollowUpService $followUps,
    ) {}

    /**
     * @param  list<array{decision_type_id: int, reason?: ?string}>  $selections
     */
    public function rectify(Council $council, CouncilStudent $row, array $selections, ?string $appreciation, string $reason, User $by): void
    {
        if (! $council->isClosed()) {
            throw CouncilException::rule('RECTIFICATION_NOT_CLOSED', 'Seul un conseil clôturé se rectifie ; avant, modifiez directement.');
        }
        if ($row->council_id !== $council->id) {
            throw CouncilException::rule('COUNCIL_BAD_STUDENT', 'Cet élève ne fait pas partie de ce conseil.');
        }
        if (blank($reason)) {
            throw CouncilException::rule('RECTIFICATION_REASON_REQUIRED', 'Le motif de la rectification est obligatoire.');
        }

        $chosen = $this->rules->validate($council, $selections);

        CouncilLock::rectifying(function () use ($council, $row, $chosen, $appreciation, $reason, $by) {
            DB::transaction(function () use ($council, $row, $chosen, $appreciation, $reason, $by) {
                $current = $row->decisions()->whereIn('status', [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL])->with('type')->get();
                $before = ['decisions' => $current->map(fn (CouncilDecision $decision) => $decision->type?->code)->all(), 'general_appreciation' => $row->general_appreciation];

                $created = collect($chosen)->map(fn (array $item) => CouncilDecision::create([
                    'council_id' => $council->id,
                    'council_student_id' => $row->id,
                    'decision_type_id' => $item['type']->id,
                    'reason' => $item['reason'],
                    'decided_by' => $by->id,
                ])->load('type'));

                foreach ($current as $old) {
                    $successor = $created->first(fn (CouncilDecision $new) => $new->type->category === $old->type?->category);
                    $old->update(['status' => CouncilDecision::RECTIFIED, 'superseded_by' => $successor?->id]);
                }

                if ($appreciation !== null) {
                    $row->update(['general_appreciation' => trim($appreciation) ?: null, 'revision' => $row->revision + 1]);
                }

                $this->followUps->createFromDecisions($council);
                $this->reportCards->syncStudent($council, $row->fresh(['decisions.type']));
                $minute = $this->minutes->finalize($council->fresh(), $by, $reason);

                CouncilWorkflow::log($council, $by, "Décision rectifiée ; procès-verbal v{$minute->version}", [
                    'student_id' => $row->student_id,
                    'reason' => $reason,
                    'old' => $before,
                    'new' => ['decisions' => $created->map(fn (CouncilDecision $decision) => $decision->type->code)->all(), 'general_appreciation' => $row->fresh()->general_appreciation],
                ]);
            });
        });
    }

    /** RG-20 : date limite de dépôt d'un recours (clôture + délai réglé). */
    public function appealDeadline(Council $council): Carbon
    {
        return ($council->closed_at ?? now())->copy()->startOfDay()->addDays(CouncilSettings::appealDays());
    }

    public function fileAppeal(Council $council, CouncilDecision $decision, Carbon $filedAt, string $filedBy, string $reason, User $by): CouncilAppeal
    {
        if (! $council->isClosed() || $decision->council_id !== $council->id) {
            throw CouncilException::rule('APPEAL_INVALID', 'Un recours porte sur une décision d’un conseil clôturé.');
        }
        if ($decision->type?->category !== DecisionType::ORIENTATION || $decision->status !== CouncilDecision::ACTIVE) {
            throw CouncilException::rule('APPEAL_NOT_ORIENTATION', 'Un recours ne vise qu’une décision d’orientation en vigueur.');
        }
        if (CouncilAppeal::where('council_decision_id', $decision->id)->where('outcome', 'pending')->exists()) {
            throw CouncilException::rule('APPEAL_PENDING', 'Un recours est déjà en cours sur cette décision.');
        }

        $deadline = $this->appealDeadline($council);
        if ($filedAt->copy()->startOfDay()->gt($deadline)) {
            throw CouncilException::rule('APPEAL_LATE', 'Le délai de recours est dépassé (jusqu’au '.$deadline->translatedFormat('d F Y').') : la décision est définitive.');
        }

        return CouncilLock::rectifying(fn () => DB::transaction(function () use ($council, $decision, $filedAt, $filedBy, $reason, $by, $deadline) {
            $appeal = CouncilAppeal::create([
                'council_id' => $council->id,
                'council_decision_id' => $decision->id,
                'filed_at' => $filedAt->toDateString(),
                'filed_by_name' => trim($filedBy),
                'reason' => trim($reason),
                'deadline' => $deadline->toDateString(),
                'recorded_by' => $by->id,
            ]);

            $decision->update(['status' => CouncilDecision::PROVISIONAL]);
            $this->reportCards->syncStudent($council, $decision->councilStudent->fresh(['decisions.type']));
            CouncilWorkflow::log($council, $by, 'Recours enregistré ; décision provisoire', ['student_id' => $decision->councilStudent->student_id, 'appeal_id' => $appeal->id]);

            return $appeal;
        }));
    }

    /** Issue du recours : décision maintenue (redevient définitive) ou modifiée (rectification, PV v+1). */
    public function decideAppeal(CouncilAppeal $appeal, string $outcome, ?int $newTypeId, ?string $comment, User $by): void
    {
        if ($appeal->outcome !== 'pending') {
            throw CouncilException::rule('APPEAL_DECIDED', 'Ce recours a déjà reçu une réponse.');
        }

        $council = $appeal->council;
        $decision = $appeal->decision()->with(['type', 'councilStudent'])->firstOrFail();

        if ($outcome === 'upheld') {
            CouncilLock::rectifying(fn () => DB::transaction(function () use ($appeal, $decision, $council, $comment, $by) {
                $decision->update(['status' => CouncilDecision::ACTIVE]);
                $appeal->update(['outcome' => 'upheld', 'outcome_at' => now(), 'outcome_comment' => $comment]);
                $this->reportCards->syncStudent($council, $decision->councilStudent->fresh(['decisions.type']));
                CouncilWorkflow::log($council, $by, 'Recours : décision maintenue', ['student_id' => $decision->councilStudent->student_id]);
            }));

            return;
        }

        if ($outcome !== 'modified' || ! $newTypeId) {
            throw CouncilException::rule('APPEAL_OUTCOME', 'Choisissez la nouvelle décision d’orientation.');
        }

        $row = $decision->councilStudent;
        $keep = $row->decisions()->whereIn('status', [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL])->with('type')->get()
            ->reject(fn (CouncilDecision $other) => $other->id === $decision->id)
            ->map(fn (CouncilDecision $other) => ['decision_type_id' => $other->decision_type_id, 'reason' => $other->reason])->values()->all();

        $this->rectify($council, $row, [...$keep, ['decision_type_id' => $newTypeId, 'reason' => 'Recours de la famille']], null, 'Recours : '.($comment ?: 'décision modifiée'), $by);

        $new = $row->decisions()->where('status', CouncilDecision::ACTIVE)->whereHas('type', fn ($query) => $query->where('category', DecisionType::ORIENTATION))->latest('id')->first();
        $appeal->update(['outcome' => 'modified', 'outcome_at' => now(), 'outcome_decision_id' => $new?->id, 'outcome_comment' => $comment]);
    }
}

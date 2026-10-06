<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFollowUp;
use App\Models\DecisionType;
use App\Models\User;
use App\Services\SafePush;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Actions de suivi (SUI-01 à SUI-04, RG-12, DEC-06) : créées à la clôture pour chaque décision dont le type « génère
 * une action », suivies jusqu'au conseil suivant, rappelées à J-7 et à l'échéance.
 */
class FollowUpService
{
    /** Délai donné par défaut pour réaliser une action, en jours. */
    public const DEFAULT_DAYS = 30;

    /** RG-12 : une action « À faire » par décision qui en génère une. Idempotent (une décision = une action). */
    public function createFromDecisions(Council $council): int
    {
        $created = 0;
        $owner = $council->main_teacher_id ?? $council->president_id;

        $decisions = CouncilDecision::with(['type', 'councilStudent'])
            ->where('council_id', $council->id)
            ->whereIn('status', [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL])
            ->get()
            ->filter(fn (CouncilDecision $decision) => $decision->type?->creates_follow_up);

        foreach ($decisions as $decision) {
            if (CouncilFollowUp::where('council_decision_id', $decision->id)->exists()) {
                continue;
            }

            CouncilFollowUp::create([
                'council_id' => $council->id,
                'student_id' => $decision->councilStudent->student_id,
                'council_decision_id' => $decision->id,
                'kind' => $decision->type->code === 'entretien_famille' ? CouncilFollowUp::FAMILY_INTERVIEW : null,
                'problem' => $decision->type->label.($decision->reason ? ' — '.$decision->reason : ''),
                'owner_id' => $owner,
                'due_date' => now()->addDays(self::DEFAULT_DAYS)->toDateString(),
                'status' => 'todo',
            ]);
            $created++;
        }

        return $created;
    }

    /** Peut modifier une action : son responsable, ou le personnel qui gère les conseils. */
    public function canManage(User $user, CouncilFollowUp $followUp): bool
    {
        return $followUp->owner_id === $user->id
            || (EnsureUserIsStaff::isStaff($user) && $user->can('modifier_conseils'));
    }

    /** @param  array<string, mixed>  $data */
    public function update(CouncilFollowUp $followUp, array $data, User $by): CouncilFollowUp
    {
        if (! $this->canManage($by, $followUp)) {
            throw CouncilException::rule('FOLLOW_UP_FORBIDDEN', 'Seul le responsable de l’action ou la pédagogie peut la modifier.');
        }

        // Le responsable met à jour l'avancement ; réassigner ou changer l'échéance revient à la pédagogie.
        if (! ($by->can('modifier_conseils') && EnsureUserIsStaff::isStaff($by))) {
            $data = array_intersect_key($data, array_flip(['status', 'comment', 'action', 'interview_at', 'interview_report']));
        }

        if (isset($data['status'])) {
            $data['completed_at'] = in_array($data['status'], CouncilFollowUp::OPEN, true) ? null : ($followUp->completed_at ?? now());
        }

        $followUp->update($data);

        return $followUp;
    }

    /**
     * SUI-03 : actions des conseils précédents d'un élève, pour la fiche en séance.
     *
     * @return Collection<int, CouncilFollowUp>
     */
    public function previousFor(Council $council, int $studentId): Collection
    {
        return CouncilFollowUp::with(['owner:id,name', 'council:id,term,academic_year_id'])
            ->where('student_id', $studentId)
            ->where('council_id', '!=', $council->id)
            ->orderByDesc('id')
            ->get();
    }

    /**
     * SUI-02 : rappel au responsable à J-7 et le jour de l'échéance, une seule fois chacun.
     *
     * @return int nombre de rappels envoyés
     */
    public function remind(?Carbon $today = null): int
    {
        $today = ($today ?? now())->copy()->startOfDay();
        $sent = 0;

        $due = CouncilFollowUp::with(['owner', 'student:id,first_name,last_name'])
            ->whereIn('status', CouncilFollowUp::OPEN)
            ->whereNotNull('owner_id')
            ->where(fn ($query) => $query
                ->where(fn ($q) => $q->whereDate('due_date', $today->copy()->addDays(7))->whereNull('reminded_before_at'))
                ->orWhere(fn ($q) => $q->whereDate('due_date', $today)->whereNull('reminded_due_at')))
            ->get();

        foreach ($due as $followUp) {
            $isToday = $followUp->due_date->isSameDay($today);
            $student = $followUp->student?->full_name ?? 'un élève';

            SafePush::send(
                $followUp->owner,
                $isToday ? 'Action de suivi à échéance' : 'Action de suivi dans 7 jours',
                ($isToday ? "Aujourd'hui" : 'Le '.$followUp->due_date->translatedFormat('d F'))." : {$followUp->problem} ({$student}).",
                $this->myActionsUrl($followUp->owner),
            );

            $followUp->update([$isToday ? 'reminded_due_at' : 'reminded_before_at' => now()]);
            $sent++;
        }

        return $sent;
    }

    public function myActionsUrl(?User $user): string
    {
        return $user && $user->hasRole('enseignant') && ! EnsureUserIsStaff::isStaff($user)
            ? route('teacher.follow-ups.index', [], false)
            : route('admin.follow-ups.mine', [], false);
    }

    /** Types d'action « entretien famille » (SUI-04). */
    public static function isInterview(?DecisionType $type): bool
    {
        return $type?->code === 'entretien_famille';
    }
}

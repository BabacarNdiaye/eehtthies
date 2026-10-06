<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilValidation;
use App\Models\User;
use App\Support\CouncilLock;
use App\Support\CouncilSettings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Du PV en rédaction à la clôture (§3.1, PV-02 à PV-04) :
 *  PV en rédaction → À valider : soumettre (observations générales saisies) ;
 *  À valider → PV en rédaction : renvoyer, commentaire obligatoire ;
 *  À valider : validation du responsable pédagogique (si double validation, PAR-09) ;
 *  À valider → Clôturé : la Direction valide et clôture (après la validation pédagogique s'il y a double validation) :
 *  PDF définitif, empreinte, verrou, actions de suivi et report sur le bulletin.
 */
class CouncilValidationFlow
{
    public function __construct(
        private readonly MinutesService $minutes,
        private readonly FollowUpService $followUps,
        private readonly ReportCardSync $reportCards,
    ) {}

    private function record(Council $council, string $step, string $action, User $by, ?string $comment = null): CouncilValidation
    {
        return CouncilValidation::create([
            'council_id' => $council->id, 'step' => $step, 'user_id' => $by->id, 'action' => $action,
            'comment' => $comment, 'acted_at' => now(),
        ]);
    }

    /** PV-02 : observations générales et recommandations, tant que le PV est en rédaction. */
    public function saveObservations(Council $council, ?string $observations, ?string $recommendations, User $by): void
    {
        CouncilLock::assertStatus($council, Council::DRAFTING_MINUTES);

        $council->update([
            'general_observations' => trim((string) $observations) ?: null,
            'recommendations' => trim((string) $recommendations) ?: null,
        ]);
    }

    public function submit(Council $council, User $by): void
    {
        CouncilLock::assertStatus($council, Council::DRAFTING_MINUTES);

        if (blank($council->general_observations)) {
            throw CouncilException::rule('MINUTES_NO_OBSERVATIONS', 'Saisissez les observations générales avant de soumettre le procès-verbal.');
        }

        DB::transaction(function () use ($council, $by) {
            $this->record($council, 'submission', 'submitted', $by);
            $council->update(['status' => Council::PENDING_VALIDATION]);
            CouncilWorkflow::log($council, $by, 'Procès-verbal soumis à validation');
        });
    }

    /** Validations obtenues depuis la dernière soumission. */
    private function approvalsSinceSubmission(Council $council): Collection
    {
        $lastSubmission = CouncilValidation::where('council_id', $council->id)->where('action', 'submitted')->max('id') ?? 0;

        return CouncilValidation::where('council_id', $council->id)->where('id', '>', $lastSubmission)->where('action', 'approved')->get();
    }

    public function approvePedagogical(Council $council, User $by, ?string $comment = null): void
    {
        CouncilLock::assertStatus($council, Council::PENDING_VALIDATION);

        if (! CouncilSettings::doubleValidation()) {
            throw CouncilException::rule('MINUTES_SINGLE_VALIDATION', 'Le circuit est à validation unique : la Direction valide et clôture directement.');
        }

        if ($this->approvalsSinceSubmission($council)->where('step', 'pedagogical')->isNotEmpty()) {
            throw CouncilException::rule('MINUTES_ALREADY_VALIDATED', 'La validation pédagogique est déjà donnée.');
        }

        $this->record($council, 'pedagogical', 'approved', $by, trim((string) $comment) ?: null);
        CouncilWorkflow::log($council, $by, 'Procès-verbal validé par le responsable pédagogique');
    }

    /** Renvoi en rédaction (PV-03) : commentaire obligatoire ; les décisions ne bougent pas. */
    public function returnToDrafting(Council $council, User $by, string $step, ?string $comment): void
    {
        CouncilLock::assertStatus($council, Council::PENDING_VALIDATION);

        if (blank($comment)) {
            throw CouncilException::rule('MINUTES_COMMENT_REQUIRED', 'Expliquez en commentaire ce qui doit être repris.');
        }

        DB::transaction(function () use ($council, $by, $step, $comment) {
            $this->record($council, $step, 'returned', $by, trim($comment));
            $council->update(['status' => Council::DRAFTING_MINUTES]);
            CouncilWorkflow::log($council, $by, 'Procès-verbal renvoyé en rédaction', ['comment' => trim($comment)]);
        });
    }

    /** PV-04 : la Direction valide et clôture : PDF définitif horodaté, numéroté, empreinte, verrou (RG-18). */
    public function close(Council $council, User $by, ?string $comment = null): void
    {
        CouncilLock::assertStatus($council, Council::PENDING_VALIDATION);

        if (CouncilSettings::doubleValidation() && $this->approvalsSinceSubmission($council)->where('step', 'pedagogical')->isEmpty()) {
            throw CouncilException::rule('MINUTES_PEDAGOGICAL_MISSING', 'La validation du responsable pédagogique est requise avant la clôture.');
        }

        DB::transaction(function () use ($council, $by, $comment) {
            $this->record($council, 'direction', 'approved', $by, trim((string) $comment) ?: null);
            $council->update(['status' => Council::CLOSED, 'closed_at' => now(), 'closed_by' => $by->id]);
            // Le PV est figé une fois le statut écrit : il dit « Clôturé » et porte sa date de clôture. Il ne touche qu'à
            // council_minutes, que la clôture ne verrouille pas (le PV signé scanné s'y joint ensuite).
            $this->minutes->finalize($council->fresh(), $by);

            // RG-12 : les actions de suivi ; SUI-05 : appréciation, mention et décision reportées sur le bulletin.
            $this->followUps->createFromDecisions($council->fresh());
            $this->reportCards->sync($council->fresh());

            CouncilWorkflow::log($council, $by, 'Conseil clôturé ; procès-verbal définitif v1 généré');
        });

        // DIR-07 : les familles sont prévenues après la réponse (et seulement si l'école l'a activé) ; un échec d'envoi
        // n'annule jamais la clôture.
        if (CouncilSettings::familyNotify()) {
            defer(fn () => rescue(fn () => app(FamilyCouncilService::class)->notify($council->fresh(), $by)));
        }
    }
}

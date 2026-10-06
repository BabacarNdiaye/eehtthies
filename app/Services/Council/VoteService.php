<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\CouncilVoteBallot;
use App\Models\DecisionType;
use App\Models\User;
use App\Support\CouncilLock;
use App\Support\CouncilSettings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Votes du conseil (VOT-01 à VOT-05, RG-13 à RG-16).
 *
 * Votant : membre dont la fonction figure dans les fonctions votantes paramétrées ET qui a le droit de vote (`can_vote`).
 * Quorum : la moitié des votants convoqués plus un doivent être présents. Un seul vote ouvert à la fois par conseil.
 */
class VoteService
{
    /** @return Collection<int, CouncilMember> votants convoqués du conseil */
    public function voters(Council $council): Collection
    {
        $functions = CouncilSettings::voteFunctions();

        return $council->members()->with('user:id,name')->get()
            ->filter(fn (CouncilMember $member) => $member->can_vote && in_array($member->function, $functions, true))
            ->values();
    }

    /** @return array{convoked: int, present: int, required: int, met: bool} RG-13 */
    public function quorum(Council $council): array
    {
        $voters = $this->voters($council);
        $convoked = $voters->count();
        $present = $voters->where('attendance', 'present')->count();
        $required = intdiv($convoked, 2) + 1;

        return ['convoked' => $convoked, 'present' => $present, 'required' => $required, 'met' => $convoked > 0 && $present >= $required];
    }

    public function openVote(Council $council): ?CouncilVote
    {
        return CouncilVote::where('council_id', $council->id)->whereNull('closed_at')->latest('id')->first();
    }

    /** VOT-01, VOT-03 : le président lance un vote sur une décision enregistrée pour l'élève, si le quorum est atteint. */
    public function open(Council $council, CouncilStudent $row, DecisionType $type, string $mode, User $by): CouncilVote
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);
        abort_unless($row->council_id === $council->id, 404);

        if (! array_key_exists($mode, CouncilVote::MODES)) {
            throw CouncilException::rule('VOTE_WRONG_MODE', 'Mode de vote inconnu.');
        }

        if (! $row->decisions()->where('decision_type_id', $type->id)->exists()) {
            throw CouncilException::rule('VOTE_DECISION_NOT_PROPOSED', "« {$type->label} » n'est pas proposée pour cet élève : cochez-la et enregistrez avant de lancer le vote.");
        }

        return DB::transaction(function () use ($council, $row, $type, $mode, $by) {
            // Verrou sur le conseil : deux ouvertures simultanées ne peuvent pas passer toutes les deux.
            Council::whereKey($council->id)->lockForUpdate()->first();

            if ($this->openVote($council)) {
                throw CouncilException::rule('VOTE_ALREADY_OPEN', 'Un vote est déjà en cours : clôturez-le avant d’en lancer un autre.');
            }

            $quorum = $this->quorum($council);
            if (! $quorum['met']) {
                throw CouncilException::rule('VOTE_QUORUM_NOT_MET', "Quorum non atteint : {$quorum['present']} votant(s) présent(s), il en faut {$quorum['required']} sur {$quorum['convoked']} (RG-13).");
            }

            $previous = CouncilVote::where('council_student_id', $row->id)->where('decision_type_id', $type->id)->whereNotNull('closed_at')->exists();

            $vote = CouncilVote::create([
                'council_id' => $council->id,
                'council_student_id' => $row->id,
                'decision_type_id' => $type->id,
                'mode' => $mode,
                'secrecy' => CouncilSettings::voteSecrecy(),
                'majority' => CouncilSettings::voteMajority(),
                'casting_vote' => CouncilSettings::voteCasting(),
                'voters_convoked' => $quorum['convoked'],
                'voters_present' => $quorum['present'],
                'quorum_required' => $quorum['required'],
                'opened_by' => $by->id,
                'opened_at' => now(),
            ]);

            $this->log($council, $by, $row, ($previous ? 'Nouveau vote ouvert après un vote clos : ' : 'Vote ouvert : ').$type->label, [
                'vote_id' => $vote->id, 'mode' => $mode, 'quorum' => $quorum,
            ]);

            return $vote;
        });
    }

    /** VOT-02 : un membre votant présent vote une fois, depuis son appareil. */
    public function cast(CouncilVote $vote, User $user, string $choice): CouncilVote
    {
        if (! array_key_exists($choice, CouncilVote::CHOICES)) {
            throw CouncilException::rule('VOTE_WRONG_CHOICE', 'Choix inconnu.');
        }

        return DB::transaction(function () use ($vote, $user, $choice) {
            $vote = CouncilVote::whereKey($vote->id)->lockForUpdate()->firstOrFail();
            $this->assertOpen($vote);

            if ($vote->mode !== 'device') {
                throw CouncilException::rule('VOTE_WRONG_MODE', 'Ce vote se fait à main levée : le président saisit le décompte.');
            }

            $member = $this->memberFor($vote->council, $user);
            if (! $member) {
                throw CouncilException::rule('VOTE_NOT_ELIGIBLE', 'Vous ne pouvez pas prendre part à ce vote : seuls les membres votants présents votent.');
            }

            if (CouncilVoteBallot::where('council_vote_id', $vote->id)->where('council_member_id', $member->id)->exists()) {
                throw CouncilException::rule('VOTE_ALREADY_CAST', 'Vous avez déjà voté.');
            }

            CouncilVoteBallot::create([
                'council_vote_id' => $vote->id,
                'council_member_id' => $member->id,
                'choice' => $vote->secrecy === 'nominal' ? $choice : null,
            ]);

            $column = ['for' => 'votes_for', 'against' => 'votes_against', 'abstain' => 'abstentions'][$choice];
            $vote->update([$column => $vote->{$column} + 1]);

            return $vote->fresh();
        });
    }

    /**
     * VOT-04, RG-14, RG-15 : clôt le vote et calcule le résultat. À main levée, le décompte est saisi par le président.
     *
     * Majorité simple des exprimés : adoptée si « pour » > « contre » ; égalité si « pour » = « contre » (au moins une
     * voix exprimée). Majorité absolue des présents : adoptée si « pour » > présents ÷ 2 ; égalité si exactement la
     * moitié. En cas d'égalité, la voix prépondérante du président (si la règle l'accorde) tranche : `casting_choice`
     * for|against ; sinon la décision est rejetée.
     *
     * @param  array{votes_for?: int, votes_against?: int, abstentions?: int, casting_choice?: string|null}  $input
     */
    public function close(CouncilVote $vote, User $by, array $input = []): CouncilVote
    {
        return DB::transaction(function () use ($vote, $by, $input) {
            $vote = CouncilVote::whereKey($vote->id)->lockForUpdate()->firstOrFail();
            $this->assertOpen($vote);
            CouncilLock::assertStatus($vote->council, Council::IN_SESSION);

            [$for, $against, $abstain] = [$vote->votes_for, $vote->votes_against, $vote->abstentions];
            if ($vote->mode === 'show_of_hands') {
                [$for, $against, $abstain] = [(int) ($input['votes_for'] ?? 0), (int) ($input['votes_against'] ?? 0), (int) ($input['abstentions'] ?? 0)];

                if (min($for, $against, $abstain) < 0 || $for + $against + $abstain > $vote->voters_present) {
                    throw CouncilException::rule('VOTE_COUNT_INVALID', "Décompte impossible : {$vote->voters_present} votant(s) présent(s) au plus.");
                }
            }

            if ($vote->majority === 'absolute_present') {
                $tie = $for * 2 === $vote->voters_present;
                $adopted = $for * 2 > $vote->voters_present;
            } else {
                $tie = $for === $against && $for > 0;
                $adopted = $for > $against;
            }

            $tieBroken = false;
            if ($tie && $vote->casting_vote) {
                $casting = $input['casting_choice'] ?? null;
                if (! in_array($casting, ['for', 'against'], true)) {
                    throw CouncilException::rule('VOTE_CASTING_REQUIRED', 'Égalité : la voix prépondérante du président doit trancher (pour ou contre).');
                }
                $adopted = $casting === 'for';
                $tieBroken = true;
            }

            $vote->update([
                'votes_for' => $for,
                'votes_against' => $against,
                'abstentions' => $abstain,
                'result' => $adopted ? 'adopted' : 'rejected',
                'tie_broken' => $tieBroken,
                'closed_by' => $by->id,
                'closed_at' => now(),
            ]);

            $vote->loadMissing('type:id,label', 'councilStudent.student:id,first_name,last_name');
            $this->log($vote->council, $by, $vote->councilStudent, 'Vote clos : '.$vote->type?->label.' '.mb_strtolower(CouncilVote::RESULTS[$vote->result]).($tieBroken ? ' (voix prépondérante du président)' : ''), [
                'vote_id' => $vote->id, 'for' => $for, 'against' => $against, 'abstentions' => $abstain,
            ]);

            return $vote;
        });
    }

    /** Membre votant présent, avec un compte, pour ce conseil ; null sinon. */
    public function memberFor(Council $council, User $user): ?CouncilMember
    {
        return $this->voters($council)->first(fn (CouncilMember $member) => $member->user_id === $user->id && $member->attendance === 'present');
    }

    /**
     * Le vote le plus récent de chaque décision soumise au vote pour cet élève (ouvert ou clos).
     *
     * @return Collection<int, CouncilVote> clé : decision_type_id
     */
    public function latestFor(CouncilStudent $row): Collection
    {
        return CouncilVote::where('council_student_id', $row->id)->orderBy('id')->get()->keyBy('decision_type_id');
    }

    /**
     * Ce qui manque, côté vote, pour clore la délibération sur cet élève : une décision soumise à vote sans vote adopté,
     * une décision rejetée au vote encore cochée, un vote en cours.
     *
     * @return list<string>
     */
    public function missing(CouncilStudent $row): array
    {
        $latest = $this->latestFor($row);
        $missing = [];

        foreach ($row->decisions()->with('type:id,label,requires_vote')->get() as $decision) {
            $label = $decision->type?->label ?? 'décision';
            $vote = $latest->get($decision->decision_type_id);

            if ($vote?->isOpen()) {
                $missing[] = "vote en cours sur « {$label} »";
            } elseif ($vote?->result === 'rejected') {
                $missing[] = "« {$label} » rejetée au vote : décochez-la ou lancez un nouveau vote";
            } elseif ($decision->type?->requires_vote && $vote?->result !== 'adopted') {
                $missing[] = "vote sur « {$label} »";
            }
        }

        return $missing;
    }

    /** @return array<string, mixed> vote présenté au président ; sur appareil, le décompte n'apparaît qu'à la clôture */
    public function present(CouncilVote $vote): array
    {
        $vote->loadMissing('type:id,label', 'councilStudent.student:id,first_name,last_name');
        $hidden = $vote->isOpen() && $vote->mode === 'device';

        return [
            'id' => $vote->id,
            'council_student_id' => $vote->council_student_id,
            'decision_type_id' => $vote->decision_type_id,
            'student' => $vote->councilStudent?->student?->full_name,
            'decision' => $vote->type?->label,
            'mode' => $vote->mode,
            'mode_label' => CouncilVote::MODES[$vote->mode] ?? $vote->mode,
            'secrecy' => $vote->secrecy,
            'majority' => $vote->majority,
            'casting_vote' => $vote->casting_vote,
            'voters_present' => $vote->voters_present,
            'quorum_required' => $vote->quorum_required,
            'ballots' => $vote->mode === 'device' ? $vote->ballots()->count() : null,
            'votes_for' => $hidden ? null : $vote->votes_for,
            'votes_against' => $hidden ? null : $vote->votes_against,
            'abstentions' => $hidden ? null : $vote->abstentions,
            'result' => $vote->result,
            'result_label' => $vote->result ? CouncilVote::RESULTS[$vote->result] : null,
            'tie_broken' => $vote->tie_broken,
            'opened_at' => $vote->opened_at?->toIso8601String(),
            'closed_at' => $vote->closed_at?->toIso8601String(),
        ];
    }

    private function assertOpen(CouncilVote $vote): void
    {
        if (! $vote->isOpen()) {
            throw CouncilException::rule('VOTE_CLOSED', 'Ce vote est clos : il ne peut pas être rouvert ni modifié. Lancez un nouveau vote si nécessaire.');
        }
    }

    private function log(Council $council, User $by, ?CouncilStudent $row, string $description, array $properties): void
    {
        activity('conseils')->causedBy($by)->performedOn($council)
            ->withProperties($properties + ['council_id' => $council->id, 'student_id' => $row?->student_id])
            ->log($description);
    }
}

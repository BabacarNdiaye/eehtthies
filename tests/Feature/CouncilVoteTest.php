<?php

namespace Tests\Feature;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\DecisionType;
use App\Models\User;
use App\Services\Council\CouncilSession;
use App\Services\Council\MinutesService;
use App\Services\Council\VoteService;
use App\Support\CouncilSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Vote en conseil (VOT-01 à VOT-05) : quorum (RG-13), majorité (RG-14), voix prépondérante du président (RG-15), vote
 * clos jamais rouvert (RG-16), décision soumise à vote exigée avant la fin de la délibération.
 */
class CouncilVoteTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private Council $council;

    private User $president;

    private User $principal;

    private User $profA;

    private User $profB;

    private User $viesco;

    private CouncilStudent $row;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->pupil('Awa');
        $this->pupil('Moussa', 'Fall');
        $this->president = $this->staff('direction', 'Présidente');
        $this->principal = $this->teacher('Principal')[0];
        $this->profA = $this->teacher('Alpha')[0];
        $this->profB = $this->teacher('Beta')[0];
        $this->viesco = $this->staff('vie-scolaire', 'Vie Scolaire');
        $this->council = $this->openCouncil($this->president, ['is_end_of_year' => true, 'main_teacher_id' => $this->principal->id], [
            ['user_id' => $this->profA->id, 'function' => 'teacher'],
            ['user_id' => $this->profB->id, 'function' => 'teacher'],
            ['user_id' => $this->viesco->id, 'function' => 'school_life'],
        ]);
        $this->row = $this->council->students()->orderBy('id')->firstOrFail();
    }

    private function votes(): VoteService
    {
        return app(VoteService::class);
    }

    private function type(string $code): DecisionType
    {
        return DecisionType::where('code', $code)->firstOrFail();
    }

    /** Le président enregistre ces décisions pour l'élève (comme l'enregistrement automatique de la séance). */
    private function propose(CouncilStudent $row, array $codes, string $review = 'reviewed'): void
    {
        app(CouncilSession::class)->saveStudent($this->council->fresh(), $row->fresh(), [
            'general_appreciation' => 'Appréciation',
            'review_status' => $review,
            'decisions' => collect($codes)->map(fn (string $code) => ['decision_type_id' => $this->type($code)->id, 'reason' => 'Motif'])->all(),
        ], $this->president);
    }

    private function absent(User ...$users): void
    {
        foreach ($users as $user) {
            CouncilMember::where('council_id', $this->council->id)->where('user_id', $user->id)->update(['attendance' => 'absent']);
        }
    }

    private function assertRefused(string $code, callable $action): void
    {
        try {
            $action();
        } catch (CouncilException $exception) {
            $this->assertSame($code, $exception->errorCode, $exception->getMessage());

            return;
        }

        $this->fail("Refus « {$code} » attendu.");
    }

    public function test_the_quorum_counts_present_voting_members_only(): void
    {
        // Votants par défaut : président, professeur principal, enseignants (4) ; la vie scolaire ne vote pas.
        $this->assertSame(['convoked' => 4, 'present' => 4, 'required' => 3, 'met' => true], $this->votes()->quorum($this->council->fresh()));

        $this->absent($this->profA, $this->profB);
        $this->propose($this->row, ['exclusion']);
        $this->assertSame(2, $this->votes()->quorum($this->council->fresh())['present']);
        $this->assertRefused('VOTE_QUORUM_NOT_MET', fn () => $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president));

        CouncilSettings::update(['vote_functions' => 'president,main_teacher,teacher,school_life']);
        $this->assertSame(['convoked' => 5, 'present' => 3, 'required' => 3, 'met' => true], $this->votes()->quorum($this->council->fresh()));
    }

    public function test_a_vote_needs_a_proposed_decision_and_only_one_runs_at_a_time(): void
    {
        $this->assertRefused('VOTE_DECISION_NOT_PROPOSED', fn () => $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president));

        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);
        $this->assertSame(4, $vote->voters_present);
        $this->assertSame(3, $vote->quorum_required);
        $this->assertSame('nominal', $vote->secrecy);

        $other = $this->council->students()->orderByDesc('id')->firstOrFail();
        $this->propose($other, ['passage']);
        $this->assertRefused('VOTE_ALREADY_OPEN', fn () => $this->votes()->open($this->council->fresh(), $other, $this->type('passage'), 'device', $this->president));
    }

    public function test_present_voters_cast_one_ballot_each_and_the_simple_majority_decides(): void
    {
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);

        $this->votes()->cast($vote, $this->profA, 'for');
        $this->votes()->cast($vote->fresh(), $this->profB, 'for');
        $this->votes()->cast($vote->fresh(), $this->principal, 'against');
        $this->votes()->cast($vote->fresh(), $this->president, 'abstain');

        $this->assertRefused('VOTE_ALREADY_CAST', fn () => $this->votes()->cast($vote->fresh(), $this->profA, 'against'));
        $this->assertRefused('VOTE_NOT_ELIGIBLE', fn () => $this->votes()->cast($vote->fresh(), $this->viesco, 'for'));

        $closed = $this->votes()->close($vote->fresh(), $this->president);
        $this->assertSame([2, 1, 1], [$closed->votes_for, $closed->votes_against, $closed->abstentions]);
        $this->assertSame('adopted', $closed->result, 'RG-14 : les abstentions ne comptent pas.');
        $this->assertFalse($closed->tie_broken);
        $this->assertSame('for', $closed->ballots()->whereHas('member', fn ($q) => $q->where('user_id', $this->profA->id))->value('choice'), 'Vote nominatif : le choix est conservé.');
    }

    public function test_an_absent_member_cannot_vote(): void
    {
        $this->absent($this->profB);
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);

        $this->assertRefused('VOTE_NOT_ELIGIBLE', fn () => $this->votes()->cast($vote, $this->profB, 'for'));
    }

    public function test_a_tie_is_settled_by_the_president_when_the_rule_allows_it(): void
    {
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);
        $this->votes()->cast($vote, $this->profA, 'for');
        $this->votes()->cast($vote->fresh(), $this->profB, 'against');

        $this->assertRefused('VOTE_CASTING_REQUIRED', fn () => $this->votes()->close($vote->fresh(), $this->president));

        $closed = $this->votes()->close($vote->fresh(), $this->president, ['casting_choice' => 'against']);
        $this->assertSame('rejected', $closed->result);
        $this->assertTrue($closed->tie_broken, 'RG-15 : voix prépondérante du président.');
    }

    public function test_without_casting_vote_a_tie_rejects(): void
    {
        CouncilSettings::update(['vote_casting' => false]);
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);

        $closed = $this->votes()->close($vote, $this->president, ['votes_for' => 2, 'votes_against' => 2, 'abstentions' => 0]);
        $this->assertSame('rejected', $closed->result);
        $this->assertFalse($closed->tie_broken);
    }

    public function test_the_absolute_majority_of_present_members_counts_abstentions_against(): void
    {
        CouncilSettings::update(['vote_majority' => 'absolute_present']);
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);

        // 4 présents : il faut au moins 3 voix pour (2 = égalité avec la moitié, 1 = rejet).
        $closed = $this->votes()->close($vote, $this->president, ['votes_for' => 1, 'votes_against' => 0, 'abstentions' => 3]);
        $this->assertSame('rejected', $closed->result);
    }

    public function test_a_show_of_hands_cannot_count_more_votes_than_present_voters(): void
    {
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);

        $this->assertRefused('VOTE_COUNT_INVALID', fn () => $this->votes()->close($vote, $this->president, ['votes_for' => 4, 'votes_against' => 1, 'abstentions' => 0]));
        $this->assertRefused('VOTE_WRONG_MODE', fn () => $this->votes()->cast($vote->fresh(), $this->profA, 'for'));
    }

    public function test_a_secret_vote_keeps_who_voted_but_not_the_choice(): void
    {
        CouncilSettings::update(['vote_secrecy' => 'secret']);
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);
        $this->votes()->cast($vote, $this->profA, 'for');
        $this->votes()->cast($vote->fresh(), $this->profB, 'for');
        $this->votes()->cast($vote->fresh(), $this->principal, 'for');

        $this->assertSame(3, $vote->ballots()->count());
        $this->assertSame(0, $vote->ballots()->whereNotNull('choice')->count());
        $this->assertSame('adopted', $this->votes()->close($vote->fresh(), $this->president)->result);
    }

    public function test_a_closed_vote_is_never_reopened_but_a_new_vote_may_follow(): void
    {
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);
        $closed = $this->votes()->close($vote, $this->president, ['votes_for' => 1, 'votes_against' => 3, 'abstentions' => 0]);

        $this->assertRefused('VOTE_CLOSED', fn () => $this->votes()->close($closed->fresh(), $this->president, ['votes_for' => 4, 'votes_against' => 0, 'abstentions' => 0]));
        $this->assertRefused('VOTE_CLOSED', fn () => $closed->fresh()->update(['result' => 'adopted']));
        $this->assertRefused('VOTE_CLOSED', fn () => $closed->fresh()->delete());

        $second = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);
        $this->assertNotSame($closed->id, $second->id);
        $this->assertSame('rejected', $closed->fresh()->result);
        $this->assertDatabaseHas('activity_log', ['log_name' => 'conseils', 'description' => 'Nouveau vote ouvert après un vote clos : Exclusion']);
    }

    public function test_the_deliberation_waits_for_an_adopted_vote_on_decisions_that_require_one(): void
    {
        foreach ($this->council->students()->get() as $row) {
            $this->propose($row, ['passage']);
        }
        $this->propose($this->row, ['exclusion']);

        $this->assertRefused('COUNCIL_DELIBERATION_INCOMPLETE', fn () => app(CouncilSession::class)->endDeliberation($this->council->fresh(), $this->president));

        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);
        $this->votes()->close($vote, $this->president, ['votes_for' => 1, 'votes_against' => 3, 'abstentions' => 0]);
        try {
            app(CouncilSession::class)->endDeliberation($this->council->fresh(), $this->president);
            $this->fail('Une décision rejetée au vote ne peut pas rester.');
        } catch (CouncilException $exception) {
            $this->assertStringContainsString('rejetée au vote', $exception->getMessage());
        }

        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'show_of_hands', $this->president);
        $this->votes()->close($vote, $this->president, ['votes_for' => 3, 'votes_against' => 1, 'abstentions' => 0]);
        app(CouncilSession::class)->endDeliberation($this->council->fresh(), $this->president);
        $this->assertSame(Council::DRAFTING_MINUTES, $this->council->fresh()->status);
    }

    public function test_the_minutes_report_each_closed_vote_without_names(): void
    {
        $this->propose($this->row, ['exclusion']);
        $vote = $this->votes()->open($this->council->fresh(), $this->row, $this->type('exclusion'), 'device', $this->president);
        $this->votes()->cast($vote, $this->profA, 'for');
        $this->votes()->cast($vote->fresh(), $this->profB, 'for');
        $this->votes()->cast($vote->fresh(), $this->principal, 'against');
        $this->votes()->close($vote->fresh(), $this->president);

        $data = app(MinutesService::class)->data($this->council->fresh());
        $this->assertCount(1, $data['votes']);
        $this->assertSame(['for' => 2, 'against' => 1, 'abstentions' => 0], $data['votes'][0]['count']);
        $this->assertSame('Adoptée', $data['votes'][0]['result']);
        $this->assertStringNotContainsString('Alpha', json_encode($data['votes']));
        $html = view('pdf.council-minutes', $data + ['draft' => true, 'contentHash' => 'x'])->render();
        $this->assertStringContainsString('Votes', $html);
        $this->assertStringContainsString('Adoptée', $html);
    }

    public function test_members_vote_from_their_phone_and_the_president_closes_from_the_session(): void
    {
        $this->propose($this->row, ['exclusion']);

        $this->actingAs($this->president)->postJson(route('council.votes.store', $this->council), [
            'council_student_id' => $this->row->id, 'decision_type_id' => $this->type('exclusion')->id, 'mode' => 'device',
        ])->assertCreated();
        $vote = CouncilVote::firstOrFail();

        $this->actingAs($this->profA)->get(route('council.vote.show', $this->council))->assertInertia(fn (Assert $page) => $page->component('Council/Vote'));
        $this->actingAs($this->profA)->getJson(route('council.votes.state', $this->council))
            ->assertOk()->assertJsonPath('vote.id', $vote->id)->assertJsonPath('vote.can_vote', true)->assertJsonPath('vote.has_voted', false)
            ->assertJsonMissingPath('vote.votes_for');
        $this->actingAs($this->profA)->postJson(route('council.votes.ballot', [$this->council, $vote]), ['choice' => 'for'])->assertOk();
        $this->actingAs($this->profA)->getJson(route('council.votes.state', $this->council))->assertJsonPath('vote.has_voted', true);

        $this->actingAs($this->profB)->postJson(route('council.votes.ballot', [$this->council, $vote]), ['choice' => 'maybe'])->assertUnprocessable();
        $this->actingAs($this->profA)->postJson(route('council.votes.close', [$this->council, $vote]), [])->assertForbidden();

        $outsider = $this->staff('enseignant');
        $this->actingAs($outsider)->getJson(route('council.votes.state', $this->council))->assertForbidden();
        $this->actingAs($outsider)->postJson(route('council.votes.ballot', [$this->council, $vote]), ['choice' => 'for'])->assertForbidden();

        $this->actingAs($this->profB)->postJson(route('council.votes.ballot', [$this->council, $vote]), ['choice' => 'for'])->assertOk();
        $this->actingAs($this->principal)->postJson(route('council.votes.ballot', [$this->council, $vote]), ['choice' => 'for'])->assertOk();
        $this->actingAs($this->president)->postJson(route('council.votes.close', [$this->council, $vote]), [])
            ->assertOk()->assertJsonPath('vote.result', 'adopted')->assertJsonPath('vote.votes_for', 3);

        $this->actingAs($this->president)->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('voteRules.quorum.required', 3)
            ->where('votes.0.result', 'adopted')
            ->where('votes.0.council_student_id', $this->row->id));
    }

    public function test_nothing_can_be_voted_once_the_council_is_closed(): void
    {
        $picks = $this->council->students()->pluck('student_id')->mapWithKeys(fn (int $id) => [$id => [['passage']]])->all();
        $this->closeCouncil($this->council, $this->president, $picks);

        $this->assertRefused('COUNCIL_LOCKED', fn () => $this->votes()->open($this->council->fresh(), $this->row->fresh(), $this->type('passage'), 'device', $this->president));
    }
}

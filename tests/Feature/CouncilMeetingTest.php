<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilMeeting;
use App\Models\CouncilMember;
use App\Models\User;
use App\Services\Council\CouncilMeetingService;
use App\Services\Council\CouncilSession;
use App\Services\Council\MinutesService;
use App\Services\Council\VoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Visioconférence du conseil : pendant la séance seulement, réservée aux membres (avec compte) et à qui conduit la
 * séance ; rejoindre vaut présence « à distance » (quorum, procès-verbal) ; les messages de mise en relation ne vont
 * qu'à leur destinataire.
 */
class CouncilMeetingTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private Council $council;

    private User $president;

    private User $principal;

    private User $prof;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->pupil('Awa');
        $this->president = $this->staff('direction', 'Présidente');
        $this->principal = $this->teacher('Principal')[0];
        $this->prof = $this->teacher('Distant')[0];
        $this->council = $this->openCouncil($this->president, ['main_teacher_id' => $this->principal->id], [
            ['user_id' => $this->prof->id, 'function' => 'teacher'],
        ]);
        // Le professeur n'est pas dans la salle.
        CouncilMember::where('council_id', $this->council->id)->where('user_id', $this->prof->id)->update(['attendance' => 'absent']);
    }

    private function meetings(): CouncilMeetingService
    {
        return app(CouncilMeetingService::class);
    }

    public function test_the_president_starts_it_during_the_session_only(): void
    {
        $this->actingAs($this->prof)->postJson(route('council.meeting.start', $this->council), ['type' => 'video'])->assertForbidden();

        $this->actingAs($this->president)->postJson(route('council.meeting.start', $this->council), ['type' => 'video'])->assertCreated();
        $this->assertSame(1, CouncilMeeting::whereNull('ended_at')->count());
        $this->actingAs($this->president)->postJson(route('council.meeting.start', $this->council), ['type' => 'video'])
            ->assertStatus(422)->assertJsonPath('code', 'COUNCIL_MEETING_ALREADY_OPEN');

        $draft = $this->makeCouncil(['term' => 'Semestre 2'], [], $this->president);
        $this->actingAs($this->president)->postJson(route('council.meeting.start', $draft), ['type' => 'video'])
            ->assertStatus(422)->assertJsonPath('code', 'COUNCIL_WRONG_STATUS');
    }

    public function test_a_remote_member_joins_and_counts_as_present(): void
    {
        $meeting = $this->meetings()->start($this->council, $this->president, 'video');
        $this->assertSame(2, app(VoteService::class)->quorum($this->council->fresh())['present']);

        $this->actingAs($this->prof)->get(route('council.meeting.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->component('Council/Meeting')->where('meeting.id', $meeting->id)->where('canJoin', true)->has('iceServers'));
        $this->actingAs($this->prof)->postJson(route('council.meeting.join', $this->council))->assertOk()->assertJsonPath('me', $this->prof->id);

        $member = CouncilMember::where('council_id', $this->council->id)->where('user_id', $this->prof->id)->first();
        $this->assertSame('present', $member->attendance);
        $this->assertTrue($member->remote);
        $this->assertSame(3, app(VoteService::class)->quorum($this->council->fresh())['present'], 'Présent à distance : il compte pour le quorum.');

        $minutes = app(MinutesService::class)->data($this->council->fresh());
        $remote = collect($minutes['members']['present'])->firstWhere('remote', true);
        $this->assertSame('Distant Prof', $remote['name']);
        $this->assertStringContainsString('à distance', view('pdf.council-minutes', $minutes + ['draft' => true, 'contentHash' => 'x'])->render());
    }

    public function test_the_session_screen_shows_the_visio_so_the_room_sees_remote_members(): void
    {
        $meeting = $this->meetings()->start($this->council, $this->president, 'video');

        $this->actingAs($this->president)->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('visio.meeting.id', $meeting->id)
            ->where('visio.canJoin', true)
            ->where('visio.me.id', $this->president->id)
            ->has('visio.iceServers'));
        $this->actingAs($this->staff('secretariat'))->get(route('council.session.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->where('visio.canJoin', false));
    }

    public function test_outsiders_and_families_cannot_join(): void
    {
        $this->meetings()->start($this->council, $this->president, 'video');

        $this->actingAs($this->staff('enseignant'))->postJson(route('council.meeting.join', $this->council))->assertForbidden();
        $this->actingAs($this->staff('secretariat'))->postJson(route('council.meeting.join', $this->council))->assertForbidden();
        $parent = User::factory()->create();
        $parent->assignRole('parent');
        $this->actingAs($parent)->postJson(route('council.meeting.join', $this->council))->assertForbidden();
    }

    public function test_signals_reach_only_their_recipient_among_participants(): void
    {
        $meeting = $this->meetings()->start($this->council, $this->president, 'video');
        $this->actingAs($this->prof)->postJson(route('council.meeting.join', $this->council));
        $this->actingAs($this->principal)->postJson(route('council.meeting.join', $this->council));

        $this->actingAs($this->prof)->postJson(route('council.meeting.signal', $this->council), ['to' => $this->president->id, 'type' => 'offer', 'payload' => '{"sdp":"x"}'])->assertOk();
        $outsider = $this->staff('direction');
        $this->actingAs($this->prof)->postJson(route('council.meeting.signal', $this->council), ['to' => $outsider->id, 'type' => 'offer', 'payload' => '{}'])
            ->assertStatus(422)->assertJsonPath('code', 'COUNCIL_MEETING_NOT_PARTICIPANT');

        $state = $this->actingAs($this->president)->postJson(route('council.meeting.poll', $this->council), ['after' => 0, 'mic' => true, 'cam' => false])->assertOk();
        $state->assertJsonCount(3, 'participants')->assertJsonCount(1, 'signals')->assertJsonPath('signals.0.from', $this->prof->id);
        $this->actingAs($this->principal)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertJsonCount(0, 'signals');

        $this->assertSame(1, $meeting->signals()->count());
    }

    public function test_rejoining_starts_without_the_stale_messages_of_the_previous_connection(): void
    {
        $this->meetings()->start($this->council, $this->president, 'video');
        $this->actingAs($this->prof)->postJson(route('council.meeting.join', $this->council));
        $this->actingAs($this->prof)->postJson(route('council.meeting.signal', $this->council), ['to' => $this->president->id, 'type' => 'offer', 'payload' => '{"old":true}']);

        // La présidente recharge sa page : elle rejoint de nouveau, l'ancienne offre ne doit pas lui être resservie.
        $this->actingAs($this->president)->postJson(route('council.meeting.leave', $this->council));
        $this->actingAs($this->president)->postJson(route('council.meeting.join', $this->council))->assertOk();
        $this->actingAs($this->president)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertJsonCount(0, 'signals');
    }

    public function test_a_silent_participant_drops_out_and_leaving_is_explicit(): void
    {
        $this->meetings()->start($this->council, $this->president, 'audio');
        $this->actingAs($this->prof)->postJson(route('council.meeting.join', $this->council));

        $this->travel(30)->seconds();
        $this->actingAs($this->president)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertJsonCount(1, 'participants');

        $this->actingAs($this->prof)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertJsonCount(2, 'participants');
        $this->actingAs($this->prof)->postJson(route('council.meeting.leave', $this->council))->assertOk();
        $this->actingAs($this->president)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertJsonCount(1, 'participants');
    }

    public function test_polling_the_visio_never_uses_up_the_other_limits(): void
    {
        $this->meetings()->start($this->council, $this->president, 'video');
        foreach (range(1, 70) as $i) {
            $this->actingAs($this->president)->postJson(route('council.meeting.poll', $this->council), ['after' => 0])->assertOk();
        }

        // Chaque route du conseil a son propre compteur : la visio ne bloque ni l'entrée ni les votes.
        $this->actingAs($this->president)->postJson(route('council.meeting.join', $this->council))->assertOk();
        $this->actingAs($this->president)->getJson(route('council.votes.state', $this->council))->assertOk();
    }

    public function test_it_is_limited_in_size(): void
    {
        $this->meetings()->start($this->council, $this->president, 'video');
        $extra = [];
        foreach (range(1, CouncilMeetingService::MAX_PARTICIPANTS) as $i) {
            $user = $this->teacher("Membre{$i}")[0];
            CouncilMember::create(['council_id' => $this->council->id, 'user_id' => $user->id, 'function' => 'teacher', 'can_vote' => true, 'attendance' => 'pending']);
            $extra[] = $user;
        }

        foreach (array_slice($extra, 0, CouncilMeetingService::MAX_PARTICIPANTS - 1) as $user) {
            $this->actingAs($user)->postJson(route('council.meeting.join', $this->council))->assertOk();
        }
        $this->actingAs(end($extra))->postJson(route('council.meeting.join', $this->council))
            ->assertStatus(422)->assertJsonPath('code', 'COUNCIL_MEETING_FULL');
    }

    public function test_the_president_ends_it_and_the_end_of_deliberation_closes_it(): void
    {
        $meeting = $this->meetings()->start($this->council, $this->president, 'video');
        $this->actingAs($this->prof)->postJson(route('council.meeting.end', $this->council))->assertForbidden();
        $this->actingAs($this->president)->postJson(route('council.meeting.end', $this->council))->assertOk();
        $this->assertNotNull($meeting->fresh()->ended_at);
        $this->actingAs($this->prof)->postJson(route('council.meeting.join', $this->council))->assertStatus(422)->assertJsonPath('code', 'COUNCIL_MEETING_NOT_OPEN');

        $second = $this->meetings()->start($this->council->fresh(), $this->president, 'audio');
        foreach ($this->council->students()->get() as $row) {
            app(CouncilSession::class)->saveStudent($this->council->fresh(), $row, ['general_appreciation' => 'Bien', 'review_status' => 'reviewed', 'decisions' => []], $this->president);
        }
        app(CouncilSession::class)->endDeliberation($this->council->fresh(), $this->president);
        $this->assertNotNull($second->fresh()->ended_at, 'La fin de la délibération termine la visioconférence.');
    }
}

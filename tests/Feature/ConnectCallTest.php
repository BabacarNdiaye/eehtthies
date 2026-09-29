<?php

namespace Tests\Feature;

use App\Models\Call;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ConnectCallTest extends TestCase
{
    use RefreshDatabase;

    private User $alice;

    private User $bob;

    private int $conversationId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        $this->alice = User::factory()->create(['name' => 'Alice Diop']);
        $this->bob = User::factory()->create(['name' => 'Bob Fall']);
        $this->alice->assignRole('super-admin');
        $this->bob->assignRole('super-admin');

        $this->conversationId = $this->actingAs($this->alice)->postJson(route('connect.direct'), ['user_id' => $this->bob->id])->json('id');
    }

    private function startCall(string $type = 'video'): array
    {
        return $this->actingAs($this->alice)
            ->postJson(route('connect.calls.start', $this->conversationId), ['type' => $type])
            ->assertOk()
            ->json('call');
    }

    public function test_full_call_flow_with_signaling_and_call_log(): void
    {
        $call = $this->startCall('video');
        $this->assertSame('ringing', $call['status']);
        $this->assertSame('outgoing', $call['direction']);
        Notification::assertSentTo($this->bob, PushAlert::class);

        // Bob voit l'appel entrant.
        $this->actingAs($this->bob)->getJson(route('connect.calls.incoming'))
            ->assertJsonPath('call.id', $call['id'])
            ->assertJsonPath('call.direction', 'incoming')
            ->assertJsonPath('call.other.name', 'Alice Diop');

        $this->actingAs($this->bob)->postJson(route('connect.calls.answer', $call['id']))->assertJsonPath('call.status', 'active');

        // Mise en relation : chaque message n'est remis qu'à l'autre participant.
        $this->actingAs($this->alice)->postJson(route('connect.calls.signal', $call['id']), ['type' => 'offer', 'payload' => '{"type":"offer","sdp":"v=0"}'])->assertOk();
        $this->actingAs($this->bob)->postJson(route('connect.calls.signal', $call['id']), ['type' => 'answer', 'payload' => '{"type":"answer","sdp":"v=0"}'])->assertOk();

        $bobView = $this->actingAs($this->bob)->getJson(route('connect.calls.show', $call['id']))->assertOk();
        $this->assertSame(['offer'], array_column($bobView->json('signals'), 'type'));

        $aliceView = $this->actingAs($this->alice)->getJson(route('connect.calls.show', $call['id']));
        $this->assertSame(['answer'], array_column($aliceView->json('signals'), 'type'));
        $after = $aliceView->json('signals.0.id');
        $this->actingAs($this->alice)->getJson(route('connect.calls.show', $call['id']).'?after='.$after)->assertJsonCount(0, 'signals');

        $this->travel(75)->seconds();
        $this->actingAs($this->bob)->postJson(route('connect.calls.hangup', $call['id']))->assertJsonPath('call.status', 'ended');

        $this->assertDatabaseCount('call_signals', 0);
        $log = ConversationMessage::where('conversation_id', $this->conversationId)->where('kind', 'system')->sole();
        $this->assertStringStartsWith('🎥 Appel vidéo — 1 min 15 s', $log->body);
        $this->assertSame('call', $log->meta['type']);

        // L'appelant voit la fin de l'appel lors de son prochain passage.
        $this->actingAs($this->alice)->getJson(route('connect.calls.show', $call['id']))->assertJsonPath('call.status', 'ended');
        $this->actingAs($this->alice)->postJson(route('connect.calls.signal', $call['id']), ['type' => 'candidate', 'payload' => '{}'])->assertStatus(409);
    }

    public function test_declined_call_is_logged(): void
    {
        $call = $this->startCall('audio');

        $this->actingAs($this->alice)->postJson(route('connect.calls.answer', $call['id']))->assertForbidden();
        $this->actingAs($this->bob)->postJson(route('connect.calls.decline', $call['id']))->assertJsonPath('call.status', 'declined');

        $this->assertSame('📞 Appel vocal refusé', ConversationMessage::where('kind', 'system')->sole()->body);
        $this->actingAs($this->bob)->getJson(route('connect.calls.incoming'))->assertJsonPath('call', null);
    }

    public function test_unanswered_call_becomes_missed(): void
    {
        $call = $this->startCall('audio');

        $this->travel(Call::RING_TIMEOUT_SECONDS + 5)->seconds();

        $this->actingAs($this->bob)->getJson(route('connect.calls.incoming'))->assertJsonPath('call', null);
        $this->assertSame('missed', Call::find($call['id'])->status);
        $this->assertSame('📞 Appel vocal manqué', ConversationMessage::where('kind', 'system')->sole()->body);
        $this->actingAs($this->bob)->postJson(route('connect.calls.answer', $call['id']))->assertStatus(409);
    }

    public function test_caller_hanging_up_before_answer_counts_as_missed_call(): void
    {
        $call = $this->startCall('audio');
        $this->actingAs($this->alice)->postJson(route('connect.calls.hangup', $call['id']))->assertJsonPath('call.status', 'cancelled');

        $this->assertSame('📞 Appel vocal manqué', ConversationMessage::where('kind', 'system')->sole()->body);
    }

    public function test_cannot_call_someone_already_on_a_call(): void
    {
        $this->startCall();

        $carol = User::factory()->create(['name' => 'Carol Ba']);
        $carol->assignRole('super-admin');
        $withBob = $this->actingAs($carol)->postJson(route('connect.direct'), ['user_id' => $this->bob->id])->json('id');

        $this->actingAs($carol)->postJson(route('connect.calls.start', $withBob), ['type' => 'audio'])
            ->assertStatus(409)
            ->assertJson(['message' => 'Votre interlocuteur est déjà en communication.']);
    }

    public function test_outsiders_and_groups_are_rejected(): void
    {
        $call = $this->startCall();
        $outsider = User::factory()->create();

        $this->actingAs($outsider)->getJson(route('connect.calls.show', $call['id']))->assertForbidden();
        $this->actingAs($outsider)->postJson(route('connect.calls.signal', $call['id']), ['type' => 'offer', 'payload' => '{}'])->assertForbidden();
        $this->actingAs($outsider)->postJson(route('connect.calls.start', $this->conversationId), ['type' => 'audio'])->assertForbidden();

        $group = Conversation::create(['type' => 'group', 'name' => 'Projet Gala']);
        $group->participants()->create(['user_id' => $this->alice->id]);
        $this->actingAs($this->alice)->postJson(route('connect.calls.start', $group->id), ['type' => 'audio'])->assertUnprocessable();
    }

    public function test_page_provides_ice_servers(): void
    {
        config(['services.turn.url' => 'turn:turn.exemple.sn:3478', 'services.turn.username' => 'u', 'services.turn.credential' => 'p']);

        $this->actingAs($this->alice)->get(route('connect.index'))
            ->assertInertia(fn ($page) => $page
                ->where('calls.iceServers.0.urls.0', 'stun:stun.l.google.com:19302')
                ->where('calls.iceServers.1.urls.0', 'turn:turn.exemple.sn:3478'));
    }
}

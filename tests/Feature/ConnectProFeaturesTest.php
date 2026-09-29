<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Modifier/supprimer, sourdine, gestion des groupes, « en train d'écrire », « vu par ». */
class ConnectProFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;

    private User $ami;

    private User $bineta;

    private User $cheikh;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        $this->staff = User::factory()->create(['name' => 'Direction Études']);
        $this->staff->assignRole('super-admin');

        foreach (['ami' => 'Aminata Sow', 'bineta' => 'Bineta Fall', 'cheikh' => 'Cheikh Ndiaye'] as $prop => $name) {
            $this->{$prop} = User::factory()->create(['name' => $name]);
            $this->{$prop}->assignRole('eleve'); // pas du personnel : aucun droit d'administration
        }
    }

    private function direct(User $a, User $b): int
    {
        return $this->actingAs($a)->postJson(route('connect.direct'), ['user_id' => $b->id])->json('id');
    }

    private function send(User $as, int $conversationId, string $body): array
    {
        return $this->actingAs($as)->postJson(route('connect.send', $conversationId), ['body' => $body])->assertOk()->json('message');
    }

    private function group(): int
    {
        return $this->actingAs($this->staff)->postJson(route('connect.groups.store'), [
            'name' => 'Projet Gala',
            'member_ids' => [$this->ami->id, $this->bineta->id],
        ])->json('id');
    }

    // --- 1. Modifier / supprimer -------------------------------------------------

    public function test_author_can_edit_within_fifteen_minutes(): void
    {
        $id = $this->direct($this->ami, $this->bineta);
        $message = $this->send($this->ami, $id, 'Rendez-vous à 10h');
        $this->assertTrue($message['can_edit']);

        $this->actingAs($this->bineta)->patchJson(route('connect.messages.update', $message['id']), ['body' => 'Piraté'])->assertForbidden();

        $this->actingAs($this->ami)->patchJson(route('connect.messages.update', $message['id']), ['body' => 'Rendez-vous à 11h'])
            ->assertOk()
            ->assertJsonPath('message.body', 'Rendez-vous à 11h')
            ->assertJsonPath('message.edited', true);

        $this->travel(16)->minutes();
        $this->actingAs($this->ami)->patchJson(route('connect.messages.update', $message['id']), ['body' => 'Trop tard'])->assertForbidden();
    }

    public function test_delete_for_everyone_erases_content_and_attachment(): void
    {
        Storage::fake('local');
        $id = $this->direct($this->ami, $this->bineta);
        $message = $this->actingAs($this->ami)->post(route('connect.send', $id), [
            'body' => 'Voici le menu',
            'attachment' => UploadedFile::fake()->image('menu.jpg'),
        ], ['Accept' => 'application/json'])->json('message');
        $path = ConversationMessage::find($message['id'])->attachment_path;
        Storage::disk('local')->assertExists($path);

        $this->actingAs($this->bineta)->deleteJson(route('connect.messages.destroy', $message['id']))->assertForbidden();

        $this->actingAs($this->ami)->deleteJson(route('connect.messages.destroy', $message['id']))
            ->assertOk()
            ->assertJsonPath('message.deleted', true)
            ->assertJsonPath('message.body', null)
            ->assertJsonPath('message.attachment', null);

        Storage::disk('local')->assertMissing($path);
        $this->actingAs($this->bineta)->getJson(route('connect.conversations'))
            ->assertJsonPath('conversations.0.last.body', '🚫 Message supprimé');
        $this->actingAs($this->bineta)->postJson(route('connect.react', $message['id']), ['emoji' => '👍'])->assertUnprocessable();
    }

    public function test_group_admin_can_moderate_other_members_messages(): void
    {
        $group = $this->group();
        $message = $this->send($this->ami, $group, 'Message déplacé');

        $this->actingAs($this->bineta)->deleteJson(route('connect.messages.destroy', $message['id']))->assertForbidden();
        $this->actingAs($this->staff)->deleteJson(route('connect.messages.destroy', $message['id']))
            ->assertOk()
            ->assertJsonPath('message.deleted_by_moderator', true);
    }

    // --- 2. Sourdine ---------------------------------------------------------------

    public function test_muted_conversation_sends_no_push_except_mentions(): void
    {
        $group = $this->group();
        $this->actingAs($this->bineta)->postJson(route('connect.mute', $group), ['minutes' => 480])->assertJsonPath('muted', true);
        $this->actingAs($this->bineta)->getJson(route('connect.conversations'))->assertJsonPath('conversations.0.muted', true);

        $this->send($this->ami, $group, 'Réunion demain');
        Notification::assertSentTo($this->staff, PushAlert::class);
        Notification::assertNotSentTo($this->bineta, PushAlert::class);

        $this->actingAs($this->ami)->postJson(route('connect.send', $group), ['body' => '@Bineta Fall tu viens ?', 'mention_ids' => [$this->bineta->id]]);
        Notification::assertSentTo($this->bineta, PushAlert::class);

        $this->actingAs($this->bineta)->postJson(route('connect.mute', $group), ['minutes' => 0])->assertJsonPath('muted', false);
        $this->actingAs($this->bineta)->postJson(route('connect.mute', $group), ['minutes' => null])->assertJsonPath('muted', true);
        $this->actingAs($this->bineta)->postJson(route('connect.mute', $group), ['minutes' => 5])->assertUnprocessable();
    }

    // --- 3. Gestion des groupes ------------------------------------------------------

    public function test_admin_manages_members_admins_and_settings(): void
    {
        $group = $this->group();

        // Un simple membre ne peut rien modifier.
        $this->actingAs($this->ami)->postJson(route('connect.members.add', $group), ['user_ids' => [$this->cheikh->id]])->assertForbidden();

        $this->actingAs($this->staff)->postJson(route('connect.members.add', $group), ['user_ids' => [$this->cheikh->id]])->assertJsonPath('added', 1);
        $this->actingAs($this->staff)->postJson(route('connect.members.admin', [$group, $this->ami->id]))->assertJsonPath('is_admin', true);

        // Aminata, désormais administratrice, retire Cheikh et renomme le groupe.
        $this->actingAs($this->ami)->deleteJson(route('connect.members.remove', [$group, $this->cheikh->id]))->assertOk();
        $this->actingAs($this->ami)->patchJson(route('connect.group.update', $group), ['name' => 'Gala 2026'])->assertOk();

        $this->assertFalse(Conversation::find($group)->participants()->where('user_id', $this->cheikh->id)->exists());
        $this->assertSame('Gala 2026', Conversation::find($group)->name);
        $events = ConversationMessage::where('conversation_id', $group)->where('kind', 'system')->pluck('body')->all();
        $this->assertContains('Direction Études a ajouté Cheikh Ndiaye.', $events);
        $this->assertContains('Aminata Sow a retiré Cheikh Ndiaye du groupe.', $events);
        $this->assertContains('Aminata Sow a renommé le groupe en « Gala 2026 ».', $events);

        $this->actingAs($this->ami)->getJson(route('connect.details', $group))
            ->assertJsonPath('group.can_manage', true)
            ->assertJsonPath('group.can_manage_members', true);
    }

    public function test_only_admins_can_write_when_restricted(): void
    {
        $group = $this->group();
        $this->actingAs($this->staff)->patchJson(route('connect.group.update', $group), ['only_admins_can_write' => true])->assertOk();

        $this->actingAs($this->ami)->getJson(route('connect.messages', $group))
            ->assertJsonPath('can_write', false)
            ->assertJsonPath('write_restricted', true);
        $this->actingAs($this->ami)->postJson(route('connect.send', $group), ['body' => 'Coucou'])->assertForbidden();
        $this->send($this->staff, $group, 'Annonce officielle');
    }

    public function test_group_photo(): void
    {
        Storage::fake('public');
        $group = $this->group();

        $avatar = $this->actingAs($this->staff)->post(route('connect.group.avatar', $group), ['avatar' => UploadedFile::fake()->image('logo.png')], ['Accept' => 'application/json'])
            ->assertOk()->json('avatar');

        $this->assertStringStartsWith('/storage/connect-groups/', $avatar);
        $this->actingAs($this->ami)->getJson(route('connect.conversations'))->assertJsonPath('conversations.0.avatar', $avatar);
    }

    // --- 4. En train d'écrire / vu par ------------------------------------------------

    public function test_typing_indicator_expires(): void
    {
        $id = $this->direct($this->ami, $this->bineta);
        $this->actingAs($this->ami)->postJson(route('connect.typing', $id))->assertOk();

        $this->actingAs($this->bineta)->getJson(route('connect.messages', $id))->assertJsonPath('typing', ['Aminata Sow']);
        $this->actingAs($this->ami)->getJson(route('connect.messages', $id))->assertJsonPath('typing', []);
        $this->actingAs($this->bineta)->getJson(route('connect.conversations'))->assertJsonPath('conversations.0.typing', ['Aminata Sow']);

        $this->travel(10)->seconds();
        $this->actingAs($this->bineta)->getJson(route('connect.messages', $id))->assertJsonPath('typing', []);
    }

    public function test_readers_of_a_group_message(): void
    {
        $group = $this->group();
        $message = $this->send($this->staff, $group, 'Qui a lu ?');

        $this->actingAs($this->ami)->getJson(route('connect.messages', $group)); // Aminata ouvre la conversation

        $this->actingAs($this->staff)->getJson(route('connect.messages.readers', $message['id']))
            ->assertJsonPath('read.0.name', 'Aminata Sow')
            ->assertJsonPath('unread.0.name', 'Bineta Fall');
        $this->actingAs($this->ami)->getJson(route('connect.messages.readers', $message['id']))->assertForbidden();

        $positions = $this->actingAs($this->staff)->getJson(route('connect.messages', $group))->json('read_positions');
        $this->assertSame(1, collect($positions)->filter(fn ($p) => $p >= $message['id'])->count());
    }
}

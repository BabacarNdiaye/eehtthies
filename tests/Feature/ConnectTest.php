<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ConnectTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $class;

    private User $teacherUser;

    private Teacher $teacher;

    private User $studentA;

    private User $studentB;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->class = SchoolClass::create(['name' => 'CAP Restauration 1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $subject = Subject::create(['name' => 'Technologie alimentaire', 'coefficient' => 1, 'formation_id' => $formation->id]);

        $this->teacherUser = User::factory()->create(['name' => 'Fatou Diop']);
        $this->teacherUser->assignRole('enseignant');
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Fatou', 'last_name' => 'Diop',
            'status' => 'actif', 'payment_type' => 'fixe', 'phone' => '+221 77 123 45 67',
            'professional_email' => 'fatou.diop@eeht.sn', 'specialty' => 'Technologie culinaire',
        ]);
        TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $subject->id, 'teacher_id' => $this->teacher->id,
            'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '10:00',
        ]);
        TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $subject->id, 'teacher_id' => $this->teacher->id,
            'day_of_week' => 5, 'start_time' => '14:00', 'end_time' => '16:00',
        ]);

        $this->studentA = $this->makeStudent('Babacar Ndiaye', $this->class->id);
        $this->studentB = $this->makeStudent('Awa Ndiaye', $this->class->id);

        $this->staff = User::factory()->create(['name' => 'Direction EEHT', 'position' => 'Directeur des études']);
        $this->staff->assignRole('super-admin');
    }

    private function makeStudent(string $name, ?int $classId, string $status = 'actif'): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole('eleve');
        [$first, $last] = explode(' ', $name, 2);
        Student::create([
            'user_id' => $user->id, 'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => $last,
            'status' => $status, 'school_class_id' => $classId, 'phone' => '+221 70 000 00 00',
        ]);

        return $user;
    }

    private function openDirect(User $from, User $to): int
    {
        return $this->actingAs($from)->postJson(route('connect.direct'), ['user_id' => $to->id])->assertOk()->json('id');
    }

    private function conversations(User $user): array
    {
        return $this->actingAs($user)->getJson(route('connect.conversations'))->assertOk()->json('conversations');
    }

    public function test_the_connect_page_renders_for_every_profile(): void
    {
        foreach ([$this->studentA, $this->teacherUser, $this->staff] as $user) {
            $this->actingAs($user)->get(route('connect.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page->component('Connect/Index')->where('me.id', $user->id));
        }
    }

    public function test_the_class_group_is_created_with_its_students_and_teachers(): void
    {
        $conversations = $this->conversations($this->studentA);

        $this->assertCount(1, $conversations);
        $this->assertSame('CAP Restauration 1', $conversations[0]['name']);
        $this->assertTrue($conversations[0]['is_class']);
        $this->assertSame(3, $conversations[0]['members_count']);

        $groupId = $conversations[0]['id'];
        $this->assertSame($groupId, $this->conversations($this->teacherUser)[0]['id']);
    }

    public function test_a_student_who_changes_class_leaves_the_old_class_group(): void
    {
        $groupId = $this->conversations($this->studentA)[0]['id'];

        $otherClass = SchoolClass::create(['name' => 'BTS Tourisme', 'formation_id' => $this->class->formation_id, 'academic_year_id' => $this->class->academic_year_id]);
        $this->studentA->student->update(['school_class_id' => $otherClass->id]);

        $names = collect($this->conversations($this->studentA->fresh()))->pluck('name');
        $this->assertContains('BTS Tourisme', $names);
        $this->assertNotContains('CAP Restauration 1', $names);
        $this->actingAs($this->studentA)->getJson(route('connect.messages', $groupId))->assertForbidden();
    }

    public function test_private_conversation_flow_with_unread_counts_and_read_receipts(): void
    {
        $id = $this->openDirect($this->studentA, $this->teacherUser);
        $this->assertSame($id, $this->openDirect($this->teacherUser, $this->studentA), 'une seule conversation privée par paire');

        $sent = $this->actingAs($this->studentA)->postJson(route('connect.send', $id), ['body' => 'Bonjour Madame, le devoir est pour vendredi ?'])
            ->assertOk()->json('message');

        Notification::assertSentTo($this->teacherUser, PushAlert::class);
        $this->actingAs($this->teacherUser)->getJson(route('connect.unread-count'))->assertJson(['messages' => 1]);

        $this->actingAs($this->studentA)->getJson(route('connect.messages', $id))->assertJsonPath('others_read_up_to', 0);

        $this->actingAs($this->teacherUser)->getJson(route('connect.messages', $id))
            ->assertOk()
            ->assertJsonPath('messages.0.body', 'Bonjour Madame, le devoir est pour vendredi ?')
            ->assertJsonPath('messages.0.sender_name', 'Babacar Ndiaye');

        $this->actingAs($this->teacherUser)->getJson(route('connect.unread-count'))->assertJson(['messages' => 0]);
        $this->actingAs($this->studentA)->getJson(route('connect.messages', $id))->assertJsonPath('others_read_up_to', $sent['id']);

        // Récupération incrémentale : rien de nouveau après le dernier id.
        $this->actingAs($this->teacherUser)->getJson(route('connect.messages', $id).'?after='.$sent['id'])->assertJsonCount(0, 'messages');
    }

    public function test_outsiders_cannot_read_or_write_in_a_conversation(): void
    {
        $id = $this->openDirect($this->studentA, $this->teacherUser);

        $this->actingAs($this->studentB)->getJson(route('connect.messages', $id))->assertForbidden();
        $this->actingAs($this->studentB)->postJson(route('connect.send', $id), ['body' => 'Intrus'])->assertForbidden();
        $this->actingAs($this->studentB)->getJson(route('connect.details', $id))->assertForbidden();
    }

    public function test_attachments_are_private_to_participants(): void
    {
        Storage::fake('local');
        $id = $this->openDirect($this->teacherUser, $this->studentA);

        $message = $this->actingAs($this->teacherUser)->post(route('connect.send', $id), [
            'attachment' => UploadedFile::fake()->create('Cours_Technologie_Alimentaire.pdf', 2400, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk()->json('message');

        $this->assertSame('Cours_Technologie_Alimentaire.pdf', $message['attachment']['name']);
        $stored = ConversationMessage::find($message['id']);
        Storage::disk('local')->assertExists($stored->attachment_path);

        $this->actingAs($this->studentA)->get($message['attachment']['url'])->assertOk();
        $this->actingAs($this->studentB)->get($message['attachment']['url'])->assertForbidden();

        $this->actingAs($this->studentA)->getJson(route('connect.documents'))->assertJsonPath('documents.0.name', 'Cours_Technologie_Alimentaire.pdf');
        $this->actingAs($this->studentA)->getJson(route('connect.details', $id))->assertJsonPath('files_count', 1);

        $this->actingAs($this->teacherUser)->post(route('connect.send', $id), [
            'attachment' => UploadedFile::fake()->create('virus.exe', 10),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->actingAs($this->teacherUser)->postJson(route('connect.send', $id), ['body' => ''])->assertUnprocessable();
    }

    public function test_profile_panel_shows_professional_details_only(): void
    {
        $id = $this->openDirect($this->studentA, $this->teacherUser);

        $this->actingAs($this->studentA)->getJson(route('connect.details', $id))
            ->assertJsonPath('profile.email', 'fatou.diop@eeht.sn')
            ->assertJsonPath('profile.phone', '+221 77 123 45 67')
            ->assertJsonPath('profile.position', 'Enseignant(e)')
            ->assertJsonPath('profile.availability', 'Lun, Ven : 08h - 16h')
            ->assertJsonPath('common_groups.0.name', 'CAP Restauration 1');

        // Le téléphone personnel d'un élève n'est jamais exposé.
        $this->actingAs($this->teacherUser)->getJson(route('connect.details', $id))
            ->assertJsonPath('profile.phone', null)
            ->assertJsonPath('profile.role', 'Élève');
    }

    public function test_staff_and_teachers_can_create_groups_but_students_cannot(): void
    {
        $this->actingAs($this->studentA)->postJson(route('connect.groups.store'), [
            'name' => 'Groupe élève', 'member_ids' => [$this->studentB->id],
        ])->assertForbidden();

        $id = $this->actingAs($this->teacherUser)->postJson(route('connect.groups.store'), [
            'name' => 'Projet Gala', 'member_ids' => [$this->studentA->id, $this->studentB->id],
        ])->assertOk()->json('id');

        $gala = collect($this->conversations($this->studentB))->firstWhere('id', $id);
        $this->assertSame('Projet Gala', $gala['name']);
        $this->assertSame(3, $gala['members_count']);

        $this->actingAs($this->studentB)->postJson(route('connect.leave', $id))->assertOk();
        $this->assertNull(collect($this->conversations($this->studentB))->firstWhere('id', $id));

        $classGroupId = collect($this->conversations($this->studentA))->firstWhere('is_class', true)['id'];
        $this->actingAs($this->studentA)->postJson(route('connect.leave', $classGroupId))->assertUnprocessable();
    }

    public function test_favorites_and_mark_as_unread(): void
    {
        $id = $this->openDirect($this->studentA, $this->teacherUser);
        $this->actingAs($this->teacherUser)->postJson(route('connect.send', $id), ['body' => 'Oui, vendredi.']);
        $this->actingAs($this->studentA)->getJson(route('connect.messages', $id));

        $this->actingAs($this->studentA)->postJson(route('connect.favorite', $id))->assertJson(['is_favorite' => true]);
        $this->assertTrue(collect($this->conversations($this->studentA))->firstWhere('id', $id)['is_favorite']);

        $this->actingAs($this->studentA)->postJson(route('connect.unread', $id))->assertOk();
        $this->assertSame(1, collect($this->conversations($this->studentA))->firstWhere('id', $id)['unread']);
    }

    public function test_parents_can_only_write_to_teachers_and_staff(): void
    {
        $parent = User::factory()->create(['name' => 'Parent Diallo']);
        $parent->assignRole('parent');

        $this->actingAs($parent)->postJson(route('connect.direct'), ['user_id' => $this->studentB->id])->assertForbidden();
        $this->actingAs($parent)->postJson(route('connect.direct'), ['user_id' => $this->teacherUser->id])->assertOk();
        $this->actingAs($this->studentA)->postJson(route('connect.direct'), ['user_id' => $parent->id])->assertForbidden();
        $this->actingAs($this->staff)->postJson(route('connect.direct'), ['user_id' => $parent->id])->assertOk();

        $names = collect($this->actingAs($parent)->getJson(route('connect.contacts'))->json('contacts'))->pluck('name');
        $this->assertContains('Fatou Diop', $names);
        $this->assertNotContains('Awa Ndiaye', $names);
    }

    public function test_contacts_exclude_self_and_inactive_accounts(): void
    {
        $inactive = $this->makeStudent('Moussa Inactif', $this->class->id);
        $inactive->update(['is_active' => false]);

        $names = collect($this->actingAs($this->studentA)->getJson(route('connect.contacts'))->json('contacts'))->pluck('name');

        $this->assertContains('Awa Ndiaye', $names);
        $this->assertContains('Fatou Diop', $names);
        $this->assertNotContains('Babacar Ndiaye', $names);
        $this->assertNotContains('Moussa Inactif', $names);

        $this->actingAs($this->studentA)->getJson(route('connect.contacts').'?q=fatou')->assertJsonCount(1, 'contacts');
    }

    public function test_messages_to_large_groups_are_pushed_by_the_scheduled_command(): void
    {
        $members = collect(range(1, 16))->map(fn ($i) => $this->makeStudent("Eleve Numero{$i}", null)->id)->all();
        $id = $this->actingAs($this->staff)->postJson(route('connect.groups.store'), ['name' => 'Promo 2026', 'member_ids' => $members])->json('id');

        $this->actingAs($this->staff)->postJson(route('connect.send', $id), ['body' => 'Rappel : réunion demain.'])->assertOk();

        Notification::assertNothingSent();
        $this->assertSame(1, ConversationMessage::whereNull('pushed_at')->count());

        $this->artisan('app:push-pending-messages')->assertSuccessful();

        Notification::assertSentTimes(PushAlert::class, 16);
        $this->assertSame(0, ConversationMessage::whereNull('pushed_at')->count());
    }

    public function test_admin_mail_to_a_user_with_an_account_lands_in_their_private_conversation(): void
    {
        $this->actingAs($this->staff)->post(route('admin.mail.send'), [
            'subject' => 'Convocation',
            'body' => 'Merci de passer au secrétariat.',
            'recipients' => [['email' => $this->studentA->email, 'name' => 'Babacar']],
        ])->assertRedirect();

        $conversation = Conversation::directBetween($this->staff->id, $this->studentA->id);
        $this->assertNotNull($conversation);
        $this->assertDatabaseHas('conversation_messages', [
            'conversation_id' => $conversation->id, 'subject' => 'Convocation', 'body' => 'Merci de passer au secrétariat.',
        ]);
    }

    public function test_admin_can_moderate_class_group_messages(): void
    {
        $groupId = $this->conversations($this->studentA)[0]['id'];
        $messageId = $this->actingAs($this->studentA)->postJson(route('connect.send', $groupId), ['body' => 'À modérer'])->json('message.id');

        $this->actingAs($this->staff)->get(route('admin.class-discussions.index'))->assertOk();
        $this->actingAs($this->staff)->get(route('admin.class-discussions.show', $this->class))->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('messages.0.body', 'À modérer'));

        $this->actingAs($this->staff)->delete(route('admin.class-discussions.destroy', $messageId))->assertRedirect();
        $this->assertDatabaseMissing('conversation_messages', ['id' => $messageId]);
    }

    public function test_online_status_follows_recent_activity(): void
    {
        $id = $this->openDirect($this->studentA, $this->teacherUser);
        $this->assertNotNull($this->studentA->fresh()->last_seen_at);

        $this->actingAs($this->teacherUser)->getJson(route('connect.messages', $id))->assertJsonPath('other.online', true);

        DB::table('users')->where('id', $this->studentA->id)->update(['last_seen_at' => now()->subMinutes(10)]);
        $this->actingAs($this->teacherUser)->getJson(route('connect.messages', $id))->assertJsonPath('other.online', false);
    }

    public function test_old_messaging_urls_redirect_to_connect(): void
    {
        $this->actingAs($this->studentA)->get('/notifications')->assertRedirect('/connect');
        $this->actingAs($this->studentA)->get('/annuaire')->assertRedirect('/connect?section=contacts');
        $this->actingAs($this->studentA)->get('/espace-eleve/discussion-classe')->assertRedirect('/connect?section=groups');
        $this->actingAs($this->teacherUser)->get('/espace-enseignant/discussion-classe/'.$this->class->id)->assertRedirect('/connect?class='.$this->class->id);
    }

    public function test_legacy_messages_are_migrated_into_connect(): void
    {
        // Les anciennes tables sont conservées par la refonte : on y insère un
        // historique puis on rejoue la migration de reprise.

        $announcement = Announcement::create([
            'title' => 'Rentrée', 'body' => 'Bienvenue à tous', 'priority' => 'normale', 'audience_type' => 'ecole', 'created_by' => $this->staff->id,
        ]);

        $insert = fn (array $row) => DB::table('internal_messages')->insertGetId($row + ['created_at' => now(), 'updated_at' => now()]);

        // Annonce remise comme message privé (ancien fonctionnement).
        $insert(['sender_id' => $this->staff->id, 'recipient_id' => $this->studentA->id, 'subject' => 'Rentrée', 'body' => 'Bienvenue à tous', 'read_at' => now()]);

        // Échange privé élève ↔ enseignante : le dernier message reçu par l'élève est non lu.
        $root = $insert(['sender_id' => $this->studentA->id, 'recipient_id' => $this->teacherUser->id, 'subject' => 'Devoir', 'body' => 'Question', 'read_at' => now()]);
        DB::table('internal_messages')->where('id', $root)->update(['thread_id' => $root]);
        $insert(['sender_id' => $this->teacherUser->id, 'recipient_id' => $this->studentA->id, 'thread_id' => $root, 'subject' => 'Re: Devoir', 'body' => 'Réponse', 'read_at' => null]);

        DB::table('class_messages')->insert([
            'school_class_id' => $this->class->id, 'user_id' => $this->studentB->id, 'body' => 'Salut la classe', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $migration = require database_path('migrations/2026_09_29_100001_migrate_legacy_messages_to_connect.php');
        $migration->down();
        $migration->up();

        $this->assertDatabaseHas('announcement_user', ['announcement_id' => $announcement->id, 'user_id' => $this->studentA->id]);
        $this->assertDatabaseMissing('conversation_messages', ['body' => 'Bienvenue à tous']);

        $direct = Conversation::directBetween($this->studentA->id, $this->teacherUser->id);
        $this->assertSame(['Question', 'Réponse'], $direct->messages()->orderBy('id')->pluck('body')->all());
        $this->assertSame('Devoir', $direct->messages()->orderBy('id')->first()->subject);
        $this->assertNull($direct->messages()->orderByDesc('id')->first()->subject);

        $this->actingAs($this->studentA)->getJson(route('connect.unread-count'))->assertJson(['messages' => 1]);
        $this->actingAs($this->teacherUser)->getJson(route('connect.unread-count'))->assertJson(['messages' => 0]);

        $group = Conversation::where('school_class_id', $this->class->id)->first();
        $this->assertSame('Salut la classe', $group->messages()->first()->body);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\LessonLog;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Notifications\PushAlert;
use App\Services\Ai\AssistantUnavailable;
use App\Services\Ai\ClaudeClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Mockery\MockInterface;
use Tests\TestCase;

class ConnectSmartFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $class;

    private Subject $subject;

    private User $teacherUser;

    private Teacher $teacher;

    private TimetableEntry $entry;

    private User $studentA;

    private User $studentB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->class = SchoolClass::create(['name' => 'CAP Restauration 1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->subject = Subject::create(['name' => 'Technologie alimentaire', 'coefficient' => 1, 'formation_id' => $formation->id]);

        $this->teacherUser = User::factory()->create(['name' => 'Fatou Diop']);
        $this->teacherUser->assignRole('enseignant');
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Fatou', 'last_name' => 'Diop',
            'status' => 'actif', 'payment_type' => 'fixe',
        ]);
        $this->entry = TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id, 'teacher_id' => $this->teacher->id,
            'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '10:00',
        ]);

        $this->studentA = $this->makeStudent('Babacar Ndiaye');
        $this->studentB = $this->makeStudent('Awa Ndiaye');

        // Le créneau de départ ci-dessus ne doit pas compter comme un changement.
        DB::table('connect_pending_events')->delete();
    }

    private function makeStudent(string $name, ?User $parent = null): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole('eleve');
        [$first, $last] = explode(' ', $name, 2);
        Student::create([
            'user_id' => $user->id, 'parent_user_id' => $parent?->id, 'matricule' => 'ELV-'.uniqid(),
            'first_name' => $first, 'last_name' => $last, 'status' => 'actif', 'school_class_id' => $this->class->id,
        ]);

        return $user;
    }

    private function classGroupId(User $user): int
    {
        return collect($this->actingAs($user)->getJson(route('connect.conversations'))->json('conversations'))->firstWhere('is_class', true)['id'];
    }

    private function send(User $user, int $conversationId, array $payload): array
    {
        return $this->actingAs($user)->postJson(route('connect.send', $conversationId), $payload)->assertOk()->json('message');
    }

    // ---------------------------------------------------------------
    // Mentions, réponses, réactions, épingles
    // ---------------------------------------------------------------

    public function test_mentions_notify_the_person_and_show_an_at_badge(): void
    {
        $groupId = $this->classGroupId($this->studentA);

        $message = $this->send($this->studentA, $groupId, [
            'body' => '@Fatou Diop le devoir est-il pour vendredi ?',
            'mention_ids' => [$this->teacherUser->id, 999999],
        ]);

        $this->assertSame([['id' => $this->teacherUser->id, 'name' => 'Fatou Diop']], $message['mentions']);
        Notification::assertSentTo($this->teacherUser, PushAlert::class);

        $group = collect($this->actingAs($this->teacherUser)->getJson(route('connect.conversations'))->json('conversations'))->firstWhere('id', $groupId);
        $this->assertSame(1, $group['mentions']);
        $this->assertSame(0, collect($this->actingAs($this->studentB)->getJson(route('connect.conversations'))->json('conversations'))->firstWhere('id', $groupId)['mentions']);
    }

    public function test_a_reply_quotes_the_original_message_of_the_same_conversation_only(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $original = $this->send($this->teacherUser, $groupId, ['body' => 'Le devoir est maintenu.']);

        $reply = $this->send($this->studentA, $groupId, ['body' => 'Merci Madame !', 'reply_to_id' => $original['id']]);
        $this->assertSame('Le devoir est maintenu.', $reply['reply_to']['body']);
        $this->assertSame('Fatou Diop', $reply['reply_to']['sender_name']);

        $otherConversation = $this->actingAs($this->studentA)->postJson(route('connect.direct'), ['user_id' => $this->studentB->id])->json('id');
        $this->actingAs($this->studentA)->postJson(route('connect.send', $otherConversation), [
            'body' => 'Citation interdite', 'reply_to_id' => $original['id'],
        ])->assertUnprocessable();
    }

    public function test_reactions_toggle_and_are_visible_to_other_members(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $message = $this->send($this->teacherUser, $groupId, ['body' => 'Bravo à tous !']);

        $this->actingAs($this->studentA)->postJson(route('connect.react', $message['id']), ['emoji' => '👍'])
            ->assertJsonPath('message.reactions.0.count', 1)
            ->assertJsonPath('message.reactions.0.mine', true);
        $this->actingAs($this->studentB)->postJson(route('connect.react', $message['id']), ['emoji' => '👍'])
            ->assertJsonPath('message.reactions.0.count', 2);
        $this->actingAs($this->studentA)->postJson(route('connect.react', $message['id']), ['emoji' => '👍'])
            ->assertJsonPath('message.reactions.0.count', 1)
            ->assertJsonPath('message.reactions.0.mine', false);

        $this->actingAs($this->studentA)->postJson(route('connect.react', $message['id']), ['emoji' => '🍕'])->assertUnprocessable();

        $outsider = User::factory()->create();
        $this->actingAs($outsider)->postJson(route('connect.react', $message['id']), ['emoji' => '👍'])->assertForbidden();
    }

    public function test_reaction_changes_reach_other_viewers_through_polling(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $message = $this->send($this->teacherUser, $groupId, ['body' => 'Réunion demain']);

        $since = $this->actingAs($this->studentB)->getJson(route('connect.messages', $groupId))->json('server_time');
        $this->travel(2)->seconds();
        $this->actingAs($this->studentA)->postJson(route('connect.react', $message['id']), ['emoji' => '✅']);

        $this->actingAs($this->studentB)->getJson(route('connect.messages', $groupId).'?after='.$message['id'].'&since='.urlencode($since))
            ->assertJsonCount(0, 'messages')
            ->assertJsonPath('changed.0.id', $message['id'])
            ->assertJsonPath('changed.0.reactions.0.emoji', '✅');
    }

    public function test_only_teachers_can_pin_in_a_class_group(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $message = $this->send($this->teacherUser, $groupId, ['body' => 'Examen le 15 octobre.']);

        $this->actingAs($this->studentA)->postJson(route('connect.pin', $message['id']))->assertForbidden();
        $this->actingAs($this->teacherUser)->postJson(route('connect.pin', $message['id']))->assertJsonPath('message.pinned', true);

        $this->actingAs($this->studentA)->getJson(route('connect.messages', $groupId))
            ->assertJsonPath('pinned.0.id', $message['id'])
            ->assertJsonPath('can_pin', false);
    }

    // ---------------------------------------------------------------
    // Recherche
    // ---------------------------------------------------------------

    public function test_search_finds_messages_and_files_only_in_my_conversations(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $found = $this->send($this->teacherUser, $groupId, ['body' => 'Le contrôle de pâtisserie aura lieu jeudi.']);

        $private = $this->actingAs($this->teacherUser)->postJson(route('connect.direct'), ['user_id' => $this->studentB->id])->json('id');
        $this->send($this->teacherUser, $private, ['body' => 'Pâtisserie : message privé pour Awa']);

        $results = $this->actingAs($this->studentA)->getJson(route('connect.search').'?q=tisserie')->assertOk()->json('results');
        $this->assertCount(1, $results);
        $this->assertSame($found['id'], $results[0]['id']);
        $this->assertSame('CAP Restauration 1', $results[0]['conversation_name']);

        // Saut vers le message trouvé.
        $this->actingAs($this->studentA)->getJson(route('connect.messages', $groupId).'?around='.$found['id'])
            ->assertJsonPath('messages.0.id', $found['id']);

        $this->actingAs($this->studentA)->getJson(route('connect.search').'?q=a')->assertJsonCount(0, 'results');
    }

    // ---------------------------------------------------------------
    // Rappels automatiques
    // ---------------------------------------------------------------

    private function systemMessages(): array
    {
        return ConversationMessage::where('kind', 'system')->orderBy('id')->pluck('body')->all();
    }

    public function test_exam_reminders_are_posted_once_a_week_before_and_the_day_before(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-05 07:30'));
        $exam = fn (string $date, string $title) => Exam::create([
            'title' => $title, 'type' => 'controle', 'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id,
            'exam_date' => $date, 'start_time' => '08:00', 'max_score' => 20, 'coefficient' => 1,
        ]);
        $exam('2026-10-06', 'Contrôle n°1');
        $exam('2026-10-12', 'Contrôle n°2');
        $exam('2026-10-20', 'Trop loin');

        $this->artisan('app:connect-reminders')->assertSuccessful();
        $this->artisan('app:connect-reminders')->assertSuccessful();

        $messages = $this->systemMessages();
        $this->assertCount(2, $messages);
        $this->assertStringContainsString('Contrôle de Technologie alimentaire demain', $messages[0]);
        $this->assertStringContainsString('à 08:00', $messages[0]);
        $this->assertStringContainsString('dans une semaine', $messages[1]);

        $group = Conversation::where('school_class_id', $this->class->id)->first();
        $this->assertTrue($group->participants()->where('user_id', $this->studentA->id)->exists());
        Carbon::setTestNow();
    }

    public function test_exam_reminders_wait_until_morning(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-05 03:00'));
        Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id,
            'exam_date' => '2026-10-06', 'max_score' => 20, 'coefficient' => 1,
        ]);

        $this->artisan('app:connect-reminders')->assertSuccessful();
        $this->assertSame([], $this->systemMessages());
        Carbon::setTestNow();
    }

    public function test_homework_from_the_lesson_log_is_announced_in_the_class_group(): void
    {
        LessonLog::create([
            'timetable_entry_id' => $this->entry->id, 'teacher_id' => $this->teacher->id, 'school_class_id' => $this->class->id,
            'subject_id' => $this->subject->id, 'date' => '2026-10-05', 'content' => 'Les sauces mères', 'homework' => 'Réviser la sauce béchamel.',
        ]);

        $messages = $this->systemMessages();
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('Réviser la sauce béchamel.', $messages[0]);
        $this->assertStringContainsString('Fatou Diop', $messages[0]);
    }

    public function test_timetable_changes_are_grouped_into_one_message_per_class(): void
    {
        $this->entry->update(['start_time' => '09:00']);
        TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id, 'teacher_id' => $this->teacher->id,
            'day_of_week' => 3, 'start_time' => '14:00', 'end_time' => '16:00',
        ]);
        $this->assertSame([], $this->systemMessages(), 'rien avant le passage de la commande');

        $this->artisan('app:connect-reminders')->assertSuccessful();

        $messages = $this->systemMessages();
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('Modification : Lundi 09:00', $messages[0]);
        $this->assertStringContainsString('Ajout : Mercredi 14:00–16:00', $messages[0]);
        $this->assertDatabaseCount('connect_pending_events', 0);
    }

    public function test_absences_are_sent_to_the_student_and_parent_assistant_conversation(): void
    {
        $parent = User::factory()->create(['name' => 'Parent Sow']);
        $parent->assignRole('parent');
        $child = $this->makeStudent('Moussa Sow', $parent);

        Attendance::create([
            'student_id' => $child->student->id, 'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id,
            'date' => '2026-10-05', 'status' => 'absent',
        ]);

        Notification::assertSentTo($child, PushAlert::class);
        Notification::assertSentTo($parent, PushAlert::class);

        $assistant = collect($this->actingAs($child)->getJson(route('connect.conversations'))->json('conversations'))->firstWhere('type', 'assistant');
        $this->assertSame('Assistant EEHT Connect', $assistant['name']);
        $this->assertSame(1, $assistant['unread']);

        $this->actingAs($child)->getJson(route('connect.messages', $assistant['id']))
            ->assertJsonPath('messages.0.kind', 'system')
            ->assertJsonPath('can_write', false);
        $this->assertStringContainsString('Absence enregistrée le 05/10/2026 en Technologie alimentaire', ConversationMessage::first()->body);
        $this->actingAs($child)->postJson(route('connect.send', $assistant['id']), ['body' => 'Bonjour'])->assertUnprocessable();

        $parentAssistant = Conversation::where('type', 'assistant')->forUser($parent->id)->first();
        $this->assertStringContainsString('pour Moussa Sow', $parentAssistant->messages()->first()->body);
    }

    // ---------------------------------------------------------------
    // Assistant IA
    // ---------------------------------------------------------------

    private function fakeClaude(array $response): MockInterface
    {
        return $this->mock(ClaudeClient::class, function (MockInterface $mock) use ($response) {
            $mock->shouldReceive('enabled')->andReturn(true);
            $mock->shouldReceive('json')->andReturn($response);
        });
    }

    public function test_ai_features_are_hidden_without_an_api_key(): void
    {
        config(['services.anthropic.key' => null]);
        $groupId = $this->classGroupId($this->studentA);

        $this->actingAs($this->studentA)->get(route('connect.index'))->assertInertia(fn ($page) => $page->where('ai.enabled', false));
        $this->actingAs($this->studentA)->postJson(route('connect.ai.suggest', $groupId))->assertNotFound();
    }

    public function test_ai_suggestions_use_the_conversation_transcript(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $this->send($this->teacherUser, $groupId, ['body' => 'Le devoir est pour vendredi.']);

        $mock = $this->fakeClaude(['suggestions' => ['Merci Madame !', 'Bien noté.', 'Peut-on avoir un délai ?', 'En trop']]);
        $mock->shouldReceive('json')->withArgs(fn ($system, $prompt) => str_contains($prompt, 'Fatou Diop : Le devoir est pour vendredi.')
            && str_contains($prompt, 'Babacar Ndiaye (Élève)'));

        $this->actingAs($this->studentA)->postJson(route('connect.ai.suggest', $groupId))
            ->assertOk()
            ->assertJsonCount(3, 'suggestions')
            ->assertJsonPath('suggestions.0', 'Merci Madame !');

        $outsider = User::factory()->create();
        $this->actingAs($outsider)->postJson(route('connect.ai.suggest', $groupId))->assertForbidden();
    }

    public function test_ai_summary_rewrite_and_translation(): void
    {
        $groupId = $this->classGroupId($this->studentA);

        $this->fakeClaude(['summary' => 'Résumé.', 'key_points' => ['Devoir vendredi'], 'action_items' => [], 'text' => 'Hello Madam']);

        $this->actingAs($this->studentA)->postJson(route('connect.ai.summarize', $groupId))
            ->assertJson(['summary' => 'Résumé.', 'key_points' => ['Devoir vendredi'], 'action_items' => []]);
        $this->actingAs($this->studentA)->postJson(route('connect.ai.rewrite'), ['text' => 'bjr madam', 'mode' => 'corriger'])
            ->assertJson(['text' => 'Hello Madam']);
        $this->actingAs($this->studentA)->postJson(route('connect.ai.translate'), ['text' => 'Bonjour Madame', 'language' => 'en'])
            ->assertJson(['text' => 'Hello Madam']);
        $this->actingAs($this->studentA)->postJson(route('connect.ai.rewrite'), ['text' => 'x', 'mode' => 'poeme'])->assertUnprocessable();

        $private = $this->actingAs($this->teacherUser)->postJson(route('connect.direct'), ['user_id' => $this->studentB->id])->json('id');
        $secret = $this->send($this->teacherUser, $private, ['body' => 'Message privé']);
        $this->actingAs($this->studentA)->postJson(route('connect.ai.translate'), ['message_id' => $secret['id'], 'language' => 'en'])->assertForbidden();
    }

    public function test_ai_errors_are_reported_as_unavailable(): void
    {
        $groupId = $this->classGroupId($this->studentA);
        $this->mock(ClaudeClient::class, function (MockInterface $mock) {
            $mock->shouldReceive('enabled')->andReturn(true);
            $mock->shouldReceive('json')->andThrow(new AssistantUnavailable("L'assistant est injoignable pour le moment."));
        });

        $this->actingAs($this->studentA)->postJson(route('connect.ai.summarize', $groupId))
            ->assertStatus(503)
            ->assertJson(['message' => "L'assistant est injoignable pour le moment."]);
    }
}

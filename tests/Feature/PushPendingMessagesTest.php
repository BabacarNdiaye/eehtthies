<?php

namespace Tests\Feature;

use App\Models\InternalMessage;
use App\Models\User;
use App\Notifications\PushAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PushPendingMessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_normal_create_pushes_immediately_and_marks_pushed_at(): void
    {
        Notification::fake();

        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $message = InternalMessage::create([
            'sender_id' => $sender->id, 'recipient_id' => $recipient->id, 'subject' => 'Test', 'body' => 'Hello',
        ]);

        Notification::assertSentTo($recipient, PushAlert::class);
        $this->assertNotNull($message->fresh()->pushed_at);
    }

    public function test_create_quietly_skips_the_synchronous_push(): void
    {
        Notification::fake();

        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $message = InternalMessage::createQuietly([
            'sender_id' => $sender->id, 'recipient_id' => $recipient->id, 'subject' => 'Annonce', 'body' => 'Hello all',
        ]);

        Notification::assertNothingSent();
        $this->assertNull($message->fresh()->pushed_at);
        // The thread_id self-assignment must still happen even when the push is suppressed.
        $this->assertSame($message->id, $message->fresh()->thread_id);
    }

    public function test_the_scheduled_command_delivers_pending_pushes_and_marks_them_sent(): void
    {
        Notification::fake();

        $sender = User::factory()->create();
        $recipients = User::factory()->count(3)->create();

        foreach ($recipients as $recipient) {
            InternalMessage::createQuietly([
                'sender_id' => $sender->id, 'recipient_id' => $recipient->id, 'subject' => 'Annonce', 'body' => 'Hello all',
            ]);
        }

        $this->assertSame(3, InternalMessage::whereNull('pushed_at')->count());

        $this->artisan('app:push-pending-messages')->assertSuccessful();

        foreach ($recipients as $recipient) {
            Notification::assertSentTo($recipient, PushAlert::class);
        }
        $this->assertSame(0, InternalMessage::whereNull('pushed_at')->count());

        // Running it again must not re-send anything.
        Notification::fake();
        $this->artisan('app:push-pending-messages')->assertSuccessful();
        Notification::assertNothingSent();
    }
}

<?php

namespace Tests\Feature;

use App\Models\InternalMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MessageAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_message_can_include_an_allowed_attachment(): void
    {
        Storage::fake('public');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $file = UploadedFile::fake()->create('cours.pdf', 500, 'application/pdf');

        $response = $this->actingAs($sender)->post(route('notifications.store'), [
            'recipient_id' => $recipient->id, 'subject' => 'Support', 'body' => 'Voici le cours', 'attachment' => $file,
        ]);

        $response->assertOk();
        $message = InternalMessage::first();
        $this->assertNotNull($message->attachment_path);
        $this->assertSame('cours.pdf', $message->attachment_name);
        Storage::disk('public')->assertExists($message->attachment_path);
    }

    public function test_a_reply_can_include_an_attachment(): void
    {
        Storage::fake('public');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $original = InternalMessage::create(['sender_id' => $sender->id, 'recipient_id' => $recipient->id, 'subject' => 'Devoir', 'body' => 'Bonjour']);
        $file = UploadedFile::fake()->create('correction.docx', 200);

        $response = $this->actingAs($recipient)->post(route('notifications.reply', $original->thread_id), [
            'body' => 'Voici ma correction', 'attachment' => $file,
        ]);

        $response->assertOk();
        $reply = InternalMessage::where('id', '!=', $original->id)->first();
        $this->assertNotNull($reply->attachment_path);
        Storage::disk('public')->assertExists($reply->attachment_path);
    }

    public function test_a_disallowed_file_type_is_rejected(): void
    {
        Storage::fake('public');
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $file = UploadedFile::fake()->create('virus.exe', 100);

        $response = $this->actingAs($sender)->post(route('notifications.store'), [
            'recipient_id' => $recipient->id, 'subject' => 'Test', 'body' => 'Test', 'attachment' => $file,
        ]);

        $response->assertSessionHasErrors('attachment');
    }

    public function test_a_message_without_an_attachment_still_works_normally(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $response = $this->actingAs($sender)->post(route('notifications.store'), [
            'recipient_id' => $recipient->id, 'subject' => 'Simple', 'body' => 'Pas de fichier',
        ]);

        $response->assertOk();
        $this->assertNull(InternalMessage::first()->attachment_path);
    }
}

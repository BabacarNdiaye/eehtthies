<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Expense;
use App\Models\LeaveRequest;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function expense(): Expense
    {
        return Expense::create([
            'category' => 'achats', 'label' => 'Papier', 'amount' => 5000,
            'expense_date' => '2026-10-01', 'payment_method' => 'especes',
        ]);
    }

    private function upload(User $user, string $target, int $id, ?UploadedFile $file = null)
    {
        return $this->actingAs($user)->post(route('attachments.store'), [
            'target' => $target,
            'target_id' => $id,
            'file' => $file ?? UploadedFile::fake()->create('facture.pdf', 100, 'application/pdf'),
        ]);
    }

    public function test_authorized_user_can_attach_a_document_to_an_expense(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $comptable = $this->user('comptable');

        $this->upload($comptable, 'expense', $expense->id)->assertRedirect();

        $attachment = $expense->attachments()->first();
        $this->assertNotNull($attachment);
        $this->assertSame('facture.pdf', $attachment->original_name);
        $this->assertSame($comptable->id, $attachment->uploaded_by);
        Storage::disk('local')->assertExists($attachment->file_path);
    }

    public function test_user_without_permission_cannot_attach_to_an_expense(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $enseignant = $this->user('enseignant');

        $this->upload($enseignant, 'expense', $expense->id)->assertForbidden();

        $this->assertSame(0, Attachment::count());
    }

    public function test_dangerous_file_types_are_rejected(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $comptable = $this->user('comptable');

        $this->upload($comptable, 'expense', $expense->id, UploadedFile::fake()->create('virus.php', 10, 'application/x-php'))
            ->assertSessionHasErrors('file');

        $this->assertSame(0, Attachment::count());
    }

    public function test_unknown_target_is_rejected(): void
    {
        Storage::fake('local');
        $comptable = $this->user('comptable');

        $this->upload($comptable, 'user', 1)->assertSessionHasErrors('target');
    }

    public function test_owner_can_attach_a_certificate_to_their_own_leave_but_not_to_someone_elses(): void
    {
        Storage::fake('local');
        $owner = $this->user('enseignant');
        $other = User::factory()->create();
        $other->assignRole('enseignant');

        $mine = LeaveRequest::create(['user_id' => $owner->id, 'type' => 'conge_maladie', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);
        $theirs = LeaveRequest::create(['user_id' => $other->id, 'type' => 'conge_maladie', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);

        $this->upload($owner, 'leave', $mine->id)->assertRedirect();
        $this->upload($owner, 'leave', $theirs->id)->assertForbidden();

        $this->assertSame(1, $mine->attachments()->count());
        $this->assertSame(0, $theirs->attachments()->count());
    }

    public function test_download_requires_view_permission(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $comptable = $this->user('comptable');
        $this->upload($comptable, 'expense', $expense->id);
        $attachment = $expense->attachments()->firstOrFail();

        $this->actingAs($comptable)->get(route('attachments.download', $attachment))->assertOk();

        $enseignant = User::factory()->create();
        $enseignant->assignRole('enseignant');
        $this->actingAs($enseignant)->get(route('attachments.download', $attachment))->assertForbidden();

        auth()->logout();
        $this->get(route('attachments.download', $attachment))->assertRedirect();
    }

    public function test_deleting_an_attachment_removes_the_file(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $comptable = $this->user('comptable');
        $this->upload($comptable, 'expense', $expense->id);
        $attachment = $expense->attachments()->firstOrFail();
        $path = $attachment->file_path;

        $this->actingAs($comptable)->delete(route('attachments.destroy', $attachment))->assertRedirect();

        $this->assertSame(0, Attachment::count());
        Storage::disk('local')->assertMissing($path);
    }

    public function test_deleting_the_parent_record_removes_its_attachments_and_files(): void
    {
        Storage::fake('local');
        $expense = $this->expense();
        $comptable = $this->user('comptable');
        $this->upload($comptable, 'expense', $expense->id);
        $path = $expense->attachments()->firstOrFail()->file_path;

        $expense->delete();

        $this->assertSame(0, Attachment::count());
        Storage::disk('local')->assertMissing($path);
    }
}

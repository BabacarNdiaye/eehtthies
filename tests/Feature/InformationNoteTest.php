<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\InformationNote;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use App\Mail\InformationNoteMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InformationNoteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('super-admin');
    }

    private function payload(array $overrides = []): array
    {
        return [
            'note_date' => '2025-10-24', 'subject' => 'Reprise des cours', 'body' => 'La reprise aura lieu lundi.',
            'audience_type' => 'enseignants', ...$overrides,
        ];
    }

    public function test_notes_get_sequential_numbers_per_year_and_a_formatted_reference(): void
    {
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload())->assertRedirect();
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['subject' => 'Deuxième']))->assertRedirect();
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['note_date' => '2026-01-05']))->assertRedirect();

        $notes = InformationNote::orderBy('id')->get();
        $this->assertSame([1, 2, 1], $notes->pluck('number')->all());
        $this->assertSame('000002.MEFPA/EEHT/DIR', $notes[1]->reference);
        $this->assertNotNull($notes[0]->announcement_id);
    }

    public function test_note_is_delivered_to_the_chosen_audience(): void
    {
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS', 'code' => 'B-'.uniqid(), 'slug' => 'b-'.uniqid()]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $parent = User::factory()->create();
        Student::create([
            'matricule' => 'ELV-1', 'first_name' => 'A', 'last_name' => 'B', 'formation_id' => $formation->id,
            'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'actif', 'parent_user_id' => $parent->id,
        ]);

        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['audience_type' => 'parents']))->assertRedirect();

        $note = InformationNote::firstOrFail();
        $this->assertSame([$parent->id], $note->announcement->recipients()->pluck('users.id')->all());
    }

    public function test_note_can_be_emailed_with_its_pdf_to_parents_and_guardians_without_account(): void
    {
        Mail::fake();
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS', 'code' => 'B-'.uniqid(), 'slug' => 'b-'.uniqid()]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $parent = User::factory()->create(['email' => 'parent@example.com']);
        $base = ['formation_id' => $formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'actif'];
        Student::create([...$base, 'matricule' => 'E-1', 'first_name' => 'A', 'last_name' => 'B', 'parent_user_id' => $parent->id]);
        Student::create([...$base, 'matricule' => 'E-2', 'first_name' => 'C', 'last_name' => 'D', 'guardian_email' => 'tuteur@example.com']);

        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['audience_type' => 'parents', 'send_email' => true]))->assertRedirect();

        Mail::assertQueued(InformationNoteMail::class, 2);
        Mail::assertQueued(InformationNoteMail::class, fn ($m) => $m->hasTo('tuteur@example.com'));
        $this->assertSame(2, InformationNote::firstOrFail()->emails_count);
    }

    public function test_no_email_is_sent_unless_requested(): void
    {
        Mail::fake();
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload());

        Mail::assertNothingQueued();
    }

    public function test_rich_content_is_sanitized_and_announcement_gets_a_plain_text_version(): void
    {
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload([
            'body' => '<p onclick="x()">Bonjour <strong>à tous</strong></p><script>alert(1)</script><ul><li>un</li></ul>',
        ]))->assertRedirect();

        $note = InformationNote::firstOrFail();
        $this->assertSame('<p>Bonjour <strong>à tous</strong></p><ul><li>un</li></ul>', $note->body);
        $this->assertStringNotContainsString('<', $note->announcement->body);
        $this->assertStringContainsString('Bonjour à tous', $note->announcement->body);
    }

    public function test_empty_editor_content_is_rejected(): void
    {
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['body' => '<p></p>']))
            ->assertSessionHasErrors('body');
    }

    public function test_pdf_is_generated(): void
    {
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload());

        $this->actingAs($this->admin)->get(route('admin.information-notes.pdf', InformationNote::firstOrFail()))
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_subject_and_content_are_required(): void
    {
        $this->actingAs($this->admin)->post(route('admin.information-notes.store'), $this->payload(['subject' => '', 'body' => '']))
            ->assertSessionHasErrors(['subject', 'body']);
    }
}

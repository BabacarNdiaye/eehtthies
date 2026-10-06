<?php

namespace Tests\Feature;

use App\Mail\CouncilNotice;
use App\Models\Council;
use App\Models\CouncilFollowUp;
use App\Notifications\PushAlert;
use App\Services\Council\CouncilDocuments;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/** Documents (§7.1), convocations (CRE-08), duplication (CRE-07), alerte « note modifiée après la photo » (FIG-04). */
class CouncilDocumentsTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        Storage::fake('local');
    }

    public function test_the_convocation_and_the_preparatory_sheet_are_pdfs_with_the_right_access(): void
    {
        $this->pupil('Awa');
        $council = $this->makeCouncil();

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.documents.convocation', $council))
            ->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.documents.preparatory', $council))->assertForbidden();
        $this->actingAs($this->staff('vie-scolaire'))->get(route('admin.councils.documents.preparatory', $council))
            ->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_the_decision_record_exists_only_after_closing(): void
    {
        $awa = $this->pupil('Awa');
        $president = $this->staff('responsable-pedagogique');
        $council = $this->openCouncil($president);
        $row = $council->students()->firstOrFail();

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.documents.record', [$council, $row]))->assertNotFound();

        $this->closeCouncil($council, $president, [$awa->id => [['entretien_famille']]]);
        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.documents.record', [$council, $row]))->assertOk();

        $followUp = CouncilFollowUp::firstOrFail();
        $this->actingAs($this->staff('direction'))->get(route('admin.follow-ups.interview', $followUp))->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_members_with_an_account_are_convened_by_notification_and_email(): void
    {
        Mail::fake();
        Notification::fake();
        $teacher = $this->teacher('Membre')[0];
        $by = $this->staff('responsable-pedagogique');
        $council = $this->makeCouncil(['president_id' => $by->id], [
            ['user_id' => $teacher->id, 'function' => 'teacher'],
            ['external_name' => 'Déléguée', 'function' => 'delegate_parent'],
        ], $by);

        $this->actingAs($by)->post(route('admin.councils.convocations', $council))->assertSessionHas('success');

        Notification::assertSentTo($teacher, PushAlert::class);
        Mail::assertSent(CouncilNotice::class, fn (CouncilNotice $mail) => $mail->hasTo($teacher->email) && str_contains($mail->subjectLine, 'Convocation'));
        $this->actingAs($this->staff('secretariat'))->post(route('admin.councils.convocations', $council))->assertForbidden();
    }

    public function test_a_council_is_duplicated_for_another_term_with_its_members(): void
    {
        $teacher = $this->teacher('Membre')[0];
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [['user_id' => $teacher->id, 'function' => 'teacher']], $by);

        $this->actingAs($by)->post(route('admin.councils.duplicate', $council), ['term' => 'Semestre 2'])->assertRedirect();

        $copy = Council::where('term', 'Semestre 2')->firstOrFail();
        $this->assertSame(Council::DRAFT, $copy->status);
        $this->assertTrue($copy->is_end_of_year);
        $this->assertTrue($copy->members()->where('user_id', $teacher->id)->exists());
        $this->actingAs($by)->post(route('admin.councils.duplicate', $council), ['term' => 'Semestre 2'])->assertSessionHas('error');
    }

    public function test_grades_changed_after_the_snapshot_are_counted(): void
    {
        $awa = $this->pupil('Awa');
        $exam = $this->exam($this->subject('Cuisine'));
        $grade = $this->grade($exam, $awa, 12);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $documents = app(CouncilDocuments::class);

        $this->assertSame(0, $documents->gradesChangedSinceSnapshot($council));
        app(CouncilWorkflow::class)->schedule($council, $by);
        $this->assertSame(0, $documents->gradesChangedSinceSnapshot($council->fresh()));

        $this->travel(5)->minutes();
        $grade->update(['score' => 15]);
        $this->assertSame(1, $documents->gradesChangedSinceSnapshot($council->fresh()));
    }
}

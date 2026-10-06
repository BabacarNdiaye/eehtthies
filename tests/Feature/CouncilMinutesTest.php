<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilMinute;
use App\Models\CouncilValidation;
use App\Models\User;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilWorkflow;
use App\Services\Council\MinutesService;
use App\Support\CouncilSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Procès-verbal et validation (PV-01 à PV-06) : brouillon, soumission, validation pédagogique puis Direction (PAR-09),
 * renvoi commenté, clôture (PDF définitif, SHA-256, disque privé, jamais régénéré), verrou, liens signés, PV signé.
 */
class CouncilMinutesTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $manager;

    private User $direction;

    private User $secretary;

    private Council $council;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        Storage::fake('local');

        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $awa, 13);
        $this->manager = $this->staff('responsable-pedagogique', 'Responsable');
        $this->direction = $this->staff('direction', 'Directrice');
        $this->secretary = $this->staff('secretariat', 'Secrétaire');

        $workflow = app(CouncilWorkflow::class);
        $this->council = $this->makeCouncil(['president_id' => $this->manager->id, 'secretary_id' => $this->secretary->id], [], $this->manager);
        $workflow->schedule($this->council, $this->manager);
        $this->council->members()->get()->each(fn (CouncilMember $member) => $member->update(['attendance' => 'present']));
        $workflow->start($this->council->fresh(), $this->manager, Carbon::parse('2026-11-20 15:00'));

        $row = $this->council->students()->firstOrFail();
        app(CouncilSession::class)->saveStudent($this->council->fresh(), $row, ['general_appreciation' => 'Bon semestre, à poursuivre.', 'review_status' => 'reviewed', 'decisions' => []], $this->manager);
        app(CouncilSession::class)->endDeliberation($this->council->fresh(), $this->manager);
        $this->council->refresh();
    }

    private function observe(?User $as = null)
    {
        return $this->actingAs($as ?? $this->secretary)->put(route('admin.councils.minutes.observations', $this->council), [
            'general_observations' => 'Classe sérieuse dans l’ensemble.',
            'recommendations' => 'Renforcer le suivi en anglais.',
        ]);
    }

    private function toValidation(): void
    {
        $this->observe();
        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.submit', $this->council));
    }

    public function test_the_minutes_page_shows_the_circuit_and_the_abilities(): void
    {
        $this->actingAs($this->secretary)->get(route('admin.councils.minutes', $this->council))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Minutes')
            ->where('council.status', 'drafting_minutes')
            ->where('doubleValidation', true)
            ->where('can.edit', true)
            ->where('can.submit', true)
            ->where('can.close', false));
    }

    public function test_the_draft_is_a_pdf_rendered_on_demand_and_never_stored(): void
    {
        $response = $this->actingAs($this->secretary)->get(route('admin.councils.minutes.draft', $this->council));

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertSame(0, CouncilMinute::count());
    }

    public function test_the_secretary_fills_the_observations_and_submits(): void
    {
        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.submit', $this->council))->assertSessionHas('error');

        $this->observe()->assertSessionHas('success');
        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.submit', $this->council))->assertSessionHas('success');

        $this->assertSame(Council::PENDING_VALIDATION, $this->council->fresh()->status);
        $this->assertSame('Renforcer le suivi en anglais.', $this->council->fresh()->recommendations);
    }

    public function test_a_teacher_or_the_secretariat_without_function_cannot_submit(): void
    {
        $this->observe($this->staff('secretariat'))->assertForbidden();
        $this->actingAs($this->staff('vie-scolaire'))->post(route('admin.councils.minutes.submit', $this->council))->assertForbidden();
    }

    public function test_returning_requires_a_comment_and_goes_back_to_drafting(): void
    {
        $this->toValidation();

        $this->actingAs($this->manager)->post(route('admin.councils.minutes.return', $this->council), ['comment' => ''])->assertSessionHas('error');
        $this->assertSame(Council::PENDING_VALIDATION, $this->council->fresh()->status);

        $this->actingAs($this->manager)->post(route('admin.councils.minutes.return', $this->council), ['comment' => 'Préciser la synthèse'])->assertSessionHas('success');
        $this->assertSame(Council::DRAFTING_MINUTES, $this->council->fresh()->status);
        $this->assertSame('Préciser la synthèse', CouncilValidation::where('action', 'returned')->value('comment'));
    }

    public function test_with_double_validation_the_direction_closes_only_after_the_pedagogical_step(): void
    {
        $this->toValidation();

        $this->actingAs($this->direction)->post(route('admin.councils.minutes.close', $this->council))->assertSessionHas('error');
        $this->assertSame(Council::PENDING_VALIDATION, $this->council->fresh()->status);

        $this->actingAs($this->manager)->post(route('admin.councils.minutes.validate', $this->council))->assertSessionHas('success');
        $this->actingAs($this->manager)->post(route('admin.councils.minutes.close', $this->council))->assertForbidden();
        $this->actingAs($this->direction)->post(route('admin.councils.minutes.close', $this->council))->assertSessionHas('success');

        $council = $this->council->fresh();
        $this->assertSame(Council::CLOSED, $council->status);
        $this->assertSame($this->direction->id, $council->closed_by);
        $this->assertNotNull($council->closed_at);
    }

    public function test_the_pedagogical_validation_is_offered_once_per_submission(): void
    {
        $this->toValidation();
        $can = fn () => $this->actingAs($this->manager)->get(route('admin.councils.minutes', $this->council))->viewData('page')['props']['can'];

        $this->assertTrue($can()['validatePedagogical']);
        $this->actingAs($this->manager)->post(route('admin.councils.minutes.validate', $this->council));
        $this->assertFalse($can()['validatePedagogical']);
        $this->assertTrue($can()['return']);
    }

    public function test_a_validation_after_a_return_does_not_count_for_the_next_submission(): void
    {
        $this->toValidation();
        $this->actingAs($this->manager)->post(route('admin.councils.minutes.validate', $this->council));
        $this->actingAs($this->direction)->post(route('admin.councils.minutes.return', $this->council), ['comment' => 'À reprendre']);
        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.submit', $this->council));

        $this->actingAs($this->direction)->post(route('admin.councils.minutes.close', $this->council))->assertSessionHas('error');
        $this->assertSame(Council::PENDING_VALIDATION, $this->council->fresh()->status);
    }

    public function test_with_a_single_validation_the_direction_closes_directly(): void
    {
        CouncilSettings::update(['double_validation' => false]);
        $this->toValidation();

        $this->actingAs($this->manager)->post(route('admin.councils.minutes.validate', $this->council))->assertSessionHas('error');
        $this->actingAs($this->direction)->post(route('admin.councils.minutes.close', $this->council))->assertSessionHas('success');

        $this->assertSame(Council::CLOSED, $this->council->fresh()->status);
    }

    private function close(): CouncilMinute
    {
        $this->toValidation();
        $this->actingAs($this->manager)->post(route('admin.councils.minutes.validate', $this->council));
        $this->actingAs($this->direction)->post(route('admin.councils.minutes.close', $this->council));
        $this->council->refresh();

        return CouncilMinute::firstOrFail();
    }

    public function test_closing_stores_a_numbered_pdf_with_its_sha256_on_the_private_disk(): void
    {
        $minute = $this->close();

        $this->assertSame(1, $minute->version);
        $this->assertSame(sprintf('PV-2026-%04d', $this->council->id), $minute->number);
        Storage::disk('local')->assertExists($minute->file_path);
        $this->assertStringStartsWith('councils/', $minute->file_path);
        $this->assertSame(hash('sha256', Storage::disk('local')->get($minute->file_path)), $minute->sha256);
        $this->assertTrue(app(MinutesService::class)->isIntact($minute));
        $this->assertStringStartsWith('%PDF', Storage::disk('local')->get($minute->file_path));
    }

    public function test_the_final_pdf_is_never_regenerated(): void
    {
        $minute = $this->close();
        $bytes = Storage::disk('local')->get($minute->file_path);

        $this->actingAs($this->direction)->get(route('admin.councils.minutes.download', [$this->council, $minute]))->assertOk();
        $this->actingAs($this->direction)->get(route('admin.councils.minutes', $this->council))->assertOk();

        $this->assertSame($bytes, Storage::disk('local')->get($minute->file_path));
        $this->assertSame(1, CouncilMinute::count());
    }

    public function test_a_tampered_file_is_detected(): void
    {
        $minute = $this->close();
        Storage::disk('local')->put($minute->file_path, 'falsifié');

        $this->assertFalse(app(MinutesService::class)->isIntact($minute));
    }

    public function test_everything_is_locked_after_closing(): void
    {
        $this->close();

        $this->actingAs($this->direction)->putJson(route('admin.councils.minutes.observations', $this->council), ['general_observations' => 'Réécriture'])->assertStatus(423);
        $this->actingAs($this->direction)->postJson(route('admin.councils.minutes.submit', $this->council))->assertStatus(423);
        $this->actingAs($this->manager)->putJson(route('council.session.save', [$this->council, $this->council->students()->first()]), ['review_status' => 'reviewed', 'revision' => 1])->assertStatus(423);
        $this->assertSame('Classe sérieuse dans l’ensemble.', $this->council->fresh()->general_observations);
    }

    public function test_downloads_need_the_export_right_and_are_journaled(): void
    {
        $minute = $this->close();

        $this->actingAs($this->secretary)->get(route('admin.councils.minutes.download', [$this->council, $minute]))->assertOk()->assertDownload("{$minute->number}-v1.pdf");
        $this->actingAs($this->staff('vie-scolaire'))->get(route('admin.councils.minutes.download', [$this->council, $minute]))->assertForbidden();

        $this->assertTrue(Activity::where('description', "Procès-verbal {$minute->number} v1 téléchargé")->where('causer_id', $this->secretary->id)->exists());
    }

    public function test_a_shared_link_expires_after_fifteen_minutes(): void
    {
        $minute = $this->close();

        $url = $this->actingAs($this->secretary)->getJson(route('admin.councils.minutes.link', [$this->council, $minute]))->json('url');
        $this->actingAs($this->secretary)->get($url)->assertOk();

        $this->travel(16)->minutes();
        $this->actingAs($this->secretary)->get($url)->assertForbidden();

        $forged = URL::temporarySignedRoute('admin.councils.minutes.shared', now()->addMinutes(15), ['minute' => $minute->id]);
        $this->actingAs($this->staff('comptable'))->get($forged)->assertForbidden();
    }

    public function test_the_signed_scan_is_attached_after_closing(): void
    {
        $minute = $this->close();

        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.scan', [$this->council, $minute]), ['scan' => UploadedFile::fake()->create('pv.exe', 100)])->assertSessionHasErrors('scan');
        $this->actingAs($this->secretary)->post(route('admin.councils.minutes.scan', [$this->council, $minute]), ['scan' => UploadedFile::fake()->create('pv-signe.pdf', 400, 'application/pdf')])->assertSessionHas('success');

        $minute->refresh();
        Storage::disk('local')->assertExists($minute->signed_scan_path);
        $this->actingAs($this->secretary)->get(route('admin.councils.minutes.scan.download', [$this->council, $minute]))->assertOk();
    }

    public function test_the_archive_lists_the_versions(): void
    {
        $minute = $this->close();

        $this->actingAs($this->secretary)->get(route('admin.councils.minutes', $this->council))->assertInertia(fn (Assert $page) => $page
            ->has('versions', 1)
            ->where('versions.0.number', $minute->number)
            ->where('versions.0.sha256', $minute->sha256)
            ->has('validations', 3));
    }
}

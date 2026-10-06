<?php

namespace Tests\Feature;

use App\Mail\CouncilNotice;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFamilyNotice;
use App\Models\CouncilObservation;
use App\Models\CouncilStudent;
use App\Models\Student;
use App\Models\User;
use App\Support\CouncilSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Familles (DIR-06, DIR-07, PAR-10) : l'élève et son parent ne voient que l'appréciation publiée et les décisions
 * publiables, après la clôture seulement ; la notification de clôture annonce la disponibilité sans donner le résultat.
 */
class CouncilFamilyTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private User $direction;

    private User $parent;

    private User $pupilAccount;

    private Student $awa;

    private Student $moussa;

    private Council $council;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->awa = $this->pupil('Awa');
        $this->moussa = $this->pupil('Moussa', 'Fall');
        $this->parent = User::factory()->create(['email' => 'parent.awa@example.test']);
        $this->parent->assignRole('parent');
        $this->pupilAccount = User::factory()->create();
        $this->pupilAccount->assignRole('eleve');
        $this->awa->update(['parent_user_id' => $this->parent->id, 'user_id' => $this->pupilAccount->id, 'guardian_phone' => '77 187 79 18']);
        $this->moussa->update(['guardian_email' => 'tuteur.moussa@example.test', 'guardian_phone' => '70 000 00 01']);

        $this->direction = $this->staff('direction');
        $this->council = $this->openCouncil($this->direction);

        $row = CouncilStudent::where('council_id', $this->council->id)->where('student_id', $this->awa->id)->firstOrFail();
        $row->update(['main_teacher_summary' => 'SYNTHESE-INTERNE']);
        CouncilObservation::create([
            'council_id' => $this->council->id, 'council_student_id' => $row->id, 'subject_id' => $this->subject('Anglais')->id,
            'appreciation' => 'Très bon travail en anglais.', 'internal_note' => 'NOTE-INTERNE', 'recommendation' => 'RECO-INTERNE',
        ]);
    }

    private function close(): void
    {
        $this->closeCouncil($this->council, $this->direction, [
            $this->awa->id => [['felicitations'], ['soutien']],
            $this->moussa->id => [['avertissement_travail', 'MOTIF-INTERNE']],
        ]);
    }

    public function test_families_see_nothing_before_the_council_is_closed(): void
    {
        $this->actingAs($this->pupilAccount)->get(route('student.grades'))->assertInertia(fn (Assert $page) => $page->where('councils', []));
        $this->actingAs($this->parent)->get(route('parent.child', $this->awa))->assertInertia(fn (Assert $page) => $page->where('councils', []));
    }

    public function test_after_closing_they_see_the_published_appreciation_and_decisions_only(): void
    {
        $this->close();

        $response = $this->actingAs($this->pupilAccount)->get(route('student.grades'));
        $response->assertInertia(fn (Assert $page) => $page
            ->has('councils', 1)
            ->where('councils.0.term', 'Semestre 1')
            ->where('councils.0.general_appreciation', "Appréciation de l'élève {$this->awa->id}")
            ->where('councils.0.decisions', [['label' => 'Félicitations', 'provisional' => false]])
            ->where('councils.0.subjects.0.appreciation', 'Très bon travail en anglais.'));
        foreach (['NOTE-INTERNE', 'RECO-INTERNE', 'SYNTHESE-INTERNE', 'Soutien pédagogique', 'MOTIF-INTERNE'] as $secret) {
            $this->assertStringNotContainsString($secret, $response->getContent(), "« {$secret} » ne doit jamais atteindre une famille.");
        }

        $parentPage = $this->actingAs($this->parent)->get(route('parent.child', $this->awa));
        $parentPage->assertInertia(fn (Assert $page) => $page->where('councils.0.decisions.0.label', 'Félicitations'));
        $this->assertStringNotContainsString('NOTE-INTERNE', $parentPage->getContent());

        $stranger = User::factory()->create();
        $stranger->assignRole('parent');
        $this->actingAs($stranger)->get(route('parent.child', $this->awa))->assertForbidden();
    }

    public function test_a_decision_under_appeal_is_shown_as_provisional(): void
    {
        $this->close();
        $row = CouncilStudent::where('council_id', $this->council->id)->where('student_id', $this->awa->id)->value('id');
        CouncilDecision::where('council_student_id', $row)->update(['status' => CouncilDecision::PROVISIONAL]);

        $this->actingAs($this->pupilAccount)->get(route('student.grades'))->assertInertia(fn (Assert $page) => $page
            ->where('councils.0.decisions.0.provisional', true));
    }

    public function test_closing_notifies_families_only_when_the_school_enables_it(): void
    {
        $this->withoutDefer();
        Mail::fake();

        $this->close();
        Mail::assertNothingSent();
        $this->assertSame(0, CouncilFamilyNotice::count());
    }

    public function test_an_enabled_notice_announces_the_results_without_giving_them(): void
    {
        $this->withoutDefer();
        Mail::fake();
        CouncilSettings::update([
            'family_notify' => true,
            'family_subject' => 'Conseil de classe — {periode}',
            'family_message' => 'Bonjour, le conseil de {classe} ({periode}) s’est tenu. Les résultats de {prenom} sont dans votre espace : {lien}',
        ]);

        $this->close();

        Mail::assertSent(CouncilNotice::class, 2);
        Mail::assertSent(CouncilNotice::class, fn (CouncilNotice $mail) => $mail->hasTo('parent.awa@example.test')
            && $mail->subjectLine === 'Conseil de classe — Semestre 1'
            && str_contains(implode(' ', $mail->lines), 'Les résultats de Awa')
            && ! str_contains(implode(' ', $mail->lines), 'Félicitations'));
        Mail::assertSent(CouncilNotice::class, fn (CouncilNotice $mail) => $mail->hasTo('tuteur.moussa@example.test'));
        $this->assertSame(2, CouncilFamilyNotice::count());
        $this->assertContains('mail', CouncilFamilyNotice::first()->channels);
    }

    public function test_a_manual_send_reaches_only_the_families_not_yet_notified(): void
    {
        $this->withoutDefer();
        Mail::fake();
        $this->close();

        $this->actingAs($this->staff('secretariat'))->post(route('admin.councils.family-notices.store', $this->council))->assertForbidden();

        $this->actingAs($this->direction)->post(route('admin.councils.family-notices.store', $this->council))->assertSessionHas('success');
        Mail::assertSent(CouncilNotice::class, 2);
        $this->actingAs($this->direction)->post(route('admin.councils.family-notices.store', $this->council));
        Mail::assertSent(CouncilNotice::class, 2);
        $this->assertSame(2, CouncilFamilyNotice::count());
    }

    public function test_the_secretariat_gets_ready_to_send_whatsapp_links(): void
    {
        $this->close();

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.show', $this->council))->assertInertia(fn (Assert $page) => $page
            ->has('familyNotices.whatsapp', 2)
            ->where('familyNotices.whatsapp.0.student', 'Awa Diop')
            ->where('familyNotices.whatsapp.0.url', fn (string $url) => str_starts_with($url, 'https://wa.me/221771877918?text=') && ! str_contains(urldecode($url), 'Félicitations'))
            ->where('familyNotices.sent', 0)
            ->where('familyNotices.can_send', false));
    }

    public function test_the_templates_are_edited_in_the_settings(): void
    {
        $this->actingAs($this->direction)->put(route('admin.council-settings.messages.update'), [
            'family_notify' => true, 'family_subject' => 'Résultats {periode}', 'family_message' => 'Bonjour, voir {lien}',
        ])->assertSessionHasNoErrors();

        $this->assertTrue(CouncilSettings::familyNotify());
        $this->assertSame('Résultats {periode}', CouncilSettings::familySubject());

        $this->actingAs($this->direction)->put(route('admin.council-settings.messages.update'), [
            'family_notify' => true, 'family_subject' => '', 'family_message' => 'Sans lien',
        ])->assertSessionHasErrors(['family_subject', 'family_message']);
    }
}

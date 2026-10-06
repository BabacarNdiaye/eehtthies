<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\Formation;
use App\Models\NewsArticle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Filet de sécurité du site public : chaque page s'affiche (avec ou sans données), et le dépôt de candidature —
 * que l'assistant en étapes du téléphone envoie tel quel — garde ses règles de validation.
 */
class PublicPagesTest extends TestCase
{
    use RefreshDatabase;

    private function formation(): Formation
    {
        return Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
    }

    /** @return array<string, string> */
    private function validCandidature(Formation $formation): array
    {
        return [
            'formation_id' => (string) $formation->id,
            'first_name' => 'Awa',
            'last_name' => 'Diop',
            'email' => 'awa.diop@example.test',
            'phone' => '+221 77 000 00 00',
        ];
    }

    public function test_every_public_page_renders_on_an_empty_site(): void
    {
        $names = [
            'home', 'pages.about', 'pages.teachers', 'pages.partners', 'pages.testimonials', 'pages.faq', 'pages.contact',
            'pages.legal-notice', 'pages.privacy-policy', 'formations.index', 'news.index', 'events.index', 'gallery.index',
            'candidature.create', 'candidature.track.form', 'careers.internships.index', 'careers.jobs.index',
            'community.alumni.index',
        ];

        foreach ($names as $name) {
            $this->get(route($name))->assertOk();
        }
    }

    public function test_detail_pages_render_with_content(): void
    {
        $formation = $this->formation();
        $article = NewsArticle::create(['title' => 'Rentrée 2026', 'content' => 'Contenu', 'is_published' => true, 'published_at' => now()->subDay()]);

        $this->get(route('home'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Home')
            ->has('formations', 1)
            ->has('news', 1));

        $this->get(route('formations.show', $formation->slug))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Formation/Show')
            ->where('formation.slug', $formation->slug));

        $this->get(route('news.show', $article->slug))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/News/Show'));

        $this->get(route('candidature.create', ['formation' => $formation->slug]))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Candidature/Create')
            ->where('selectedFormationId', $formation->id));
    }

    public function test_a_candidature_can_be_submitted(): void
    {
        Storage::fake(config('media-library.disk_name'));
        $formation = $this->formation();

        $response = $this->post(route('candidature.store'), [
            ...$this->validCandidature($formation),
            'gender' => 'F',
            'documents' => [UploadedFile::fake()->create('bulletin.pdf', 100, 'application/pdf')],
        ]);

        $candidature = Candidature::firstOrFail();

        $response->assertRedirect(route('candidature.confirmation', $candidature->reference));
        $this->assertSame('soumise', $candidature->status);
        $this->assertSame('site', $candidature->source);
        $this->assertCount(1, $candidature->getMedia('documents'));
        $this->get(route('candidature.confirmation', $candidature->reference))->assertOk();
    }

    public function test_the_five_required_fields_are_validated(): void
    {
        $this->post(route('candidature.store'), [])
            ->assertSessionHasErrors(['formation_id', 'first_name', 'last_name', 'email', 'phone']);

        $this->assertDatabaseCount('candidatures', 0);
    }

    public function test_optional_fields_may_stay_empty(): void
    {
        $this->post(route('candidature.store'), $this->validCandidature($this->formation()))->assertSessionHasNoErrors();

        $this->assertDatabaseCount('candidatures', 1);
    }

    public function test_documents_must_be_small_pdfs_or_images(): void
    {
        $formation = $this->formation();

        $this->post(route('candidature.store'), [
            ...$this->validCandidature($formation),
            'documents' => [UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload')],
        ])->assertSessionHasErrors(['documents.0']);

        $this->post(route('candidature.store'), [
            ...$this->validCandidature($formation),
            'documents' => [UploadedFile::fake()->create('scan.pdf', 10241, 'application/pdf')],
        ])->assertSessionHasErrors(['documents.0']);

        $this->assertDatabaseCount('candidatures', 0);
    }

    public function test_an_unknown_formation_is_rejected(): void
    {
        $this->post(route('candidature.store'), [...$this->validCandidature($this->formation()), 'formation_id' => '999999'])
            ->assertSessionHasErrors(['formation_id']);
    }
}

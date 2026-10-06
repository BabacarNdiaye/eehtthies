<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Sans le raccourci public/storage, les photos s'ouvrent quand même par /storage/… ; les dossiers sensibles et les
 * fichiers cachés restent refusés.
 */
class PublicStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_a_public_photo_is_served_without_the_symlink(): void
    {
        Storage::disk('public')->put('students/awa.jpg', 'image');

        $this->get('/storage/students/awa.jpg')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_a_missing_file_is_a_plain_404(): void
    {
        $this->get('/storage/students/absent.jpg')->assertNotFound();
    }

    public function test_student_documents_are_never_served_from_the_public_disk(): void
    {
        Storage::disk('public')->put('student-documents/1/cni.pdf', 'secret');

        $this->get('/storage/student-documents/1/cni.pdf')->assertNotFound();
    }

    public function test_hidden_files_and_other_sensitive_folders_are_refused(): void
    {
        Storage::disk('public')->put('.gitignore', '*');
        Storage::disk('public')->put('backups/dump.sql', 'sql');

        $this->get('/storage/.gitignore')->assertNotFound();
        $this->get('/storage/backups/dump.sql')->assertNotFound();
    }

    public function test_served_files_carry_their_own_restrictive_policy_that_still_allows_the_pdf_viewer(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('library/cours.pdf', '%PDF-1.4 test');

        $csp = $this->get('/storage/library/cours.pdf')->assertOk()->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("default-src 'none'", $csp);
        $this->assertStringContainsString("object-src 'self'", $csp);
        $this->assertStringNotContainsString('script-src', $csp);
    }
}

<?php

namespace Tests\Feature;

use App\Models\LibraryResource;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LibraryResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_with_permission_can_add_a_document_resource(): void
    {
        Storage::fake('public');
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $response = $this->actingAs($user)->post(route('admin.library.store'), [
            'title' => 'Guide du stage',
            'type' => 'document',
            'file' => UploadedFile::fake()->create('guide.pdf', 200, 'application/pdf'),
        ]);

        $response->assertRedirect();
        $resource = LibraryResource::firstOrFail();
        $this->assertSame('document', $resource->type);
        $this->assertNotNull($resource->file_path);
        Storage::disk('public')->assertExists($resource->file_path);
    }

    public function test_document_resource_can_be_created_with_a_client_generated_thumbnail(): void
    {
        Storage::fake('public');
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $response = $this->actingAs($user)->post(route('admin.library.store'), [
            'title' => 'Guide illustré',
            'type' => 'document',
            'file' => UploadedFile::fake()->create('guide.pdf', 200, 'application/pdf'),
            'thumbnail' => UploadedFile::fake()->image('thumbnail.png', 400, 300),
        ]);

        $response->assertRedirect();
        $resource = LibraryResource::firstOrFail();
        $this->assertNotNull($resource->thumbnail_path);
        Storage::disk('public')->assertExists($resource->thumbnail_path);
    }

    public function test_destroying_a_resource_deletes_both_its_file_and_thumbnail(): void
    {
        Storage::fake('public');
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $this->actingAs($user)->post(route('admin.library.store'), [
            'title' => 'Guide illustré',
            'type' => 'document',
            'file' => UploadedFile::fake()->create('guide.pdf', 200, 'application/pdf'),
            'thumbnail' => UploadedFile::fake()->image('thumbnail.png', 400, 300),
        ]);
        $resource = LibraryResource::firstOrFail();
        $filePath = $resource->file_path;
        $thumbnailPath = $resource->thumbnail_path;

        $this->actingAs($user)->delete(route('admin.library.destroy', $resource));

        Storage::disk('public')->assertMissing($filePath);
        Storage::disk('public')->assertMissing($thumbnailPath);
    }

    public function test_admin_with_permission_can_add_a_link_resource(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $response = $this->actingAs($user)->post(route('admin.library.store'), [
            'title' => 'Site du ministère',
            'type' => 'lien',
            'url' => 'https://example.org',
        ]);

        $response->assertRedirect();
        $resource = LibraryResource::firstOrFail();
        $this->assertSame('lien', $resource->type);
        $this->assertNull($resource->file_path);
        $this->assertSame('https://example.org', $resource->url);
    }

    public function test_user_without_permission_cannot_add_a_resource(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier'); // pas de permission formations

        $response = $this->actingAs($user)->post(route('admin.library.store'), [
            'title' => 'Interdit',
            'type' => 'lien',
            'url' => 'https://example.org',
        ]);

        $response->assertForbidden();
        $this->assertSame(0, LibraryResource::count());
    }

    public function test_admin_can_delete_any_resource_including_a_teachers_upload(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('responsable-pedagogique');
        $teacherUser = User::factory()->create();

        $resource = LibraryResource::create([
            'title' => 'Doc enseignant',
            'type' => 'lien',
            'url' => 'https://example.org',
            'uploaded_by' => $teacherUser->id,
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.library.destroy', $resource));

        $response->assertRedirect();
        $this->assertDatabaseMissing('library_resources', ['id' => $resource->id]);
    }

    public function test_teacher_can_add_a_resource_via_the_portal(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Test',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $response = $this->actingAs($user)->post(route('teacher.library.store'), [
            'title' => 'Fiche recette',
            'type' => 'lien',
            'url' => 'https://example.org/recette',
        ]);

        $response->assertRedirect();
        $resource = LibraryResource::firstOrFail();
        $this->assertSame($user->id, $resource->uploaded_by);
    }

    public function test_teacher_can_delete_their_own_resource_but_not_someone_elses(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Own',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $own = LibraryResource::create([
            'title' => 'Ma ressource',
            'type' => 'lien',
            'url' => 'https://example.org/own',
            'uploaded_by' => $user->id,
        ]);
        $someoneElse = LibraryResource::create([
            'title' => 'Ressource admin',
            'type' => 'lien',
            'url' => 'https://example.org/other',
            'uploaded_by' => User::factory()->create()->id,
        ]);

        $forbidden = $this->actingAs($user)->delete(route('teacher.library.destroy', $someoneElse));
        $forbidden->assertForbidden();
        $this->assertDatabaseHas('library_resources', ['id' => $someoneElse->id]);

        $allowed = $this->actingAs($user)->delete(route('teacher.library.destroy', $own));
        $allowed->assertRedirect();
        $this->assertDatabaseMissing('library_resources', ['id' => $own->id]);
    }

    public function test_student_can_view_the_library_read_only(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $studentUser = User::factory()->create();
        $studentUser->assignRole('eleve');
        LibraryResource::create([
            'title' => 'Support de cours',
            'type' => 'lien',
            'url' => 'https://example.org/support',
            'uploaded_by' => User::factory()->create()->id,
        ]);

        $response = $this->actingAs($studentUser)->get(route('student.library'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Portal/Student/Library')
            ->has('resources', 1)
        );
    }
}

<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CsvImportTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('import.csv', $content);
    }

    public function test_formations_are_imported_from_a_semicolon_csv_with_bom(): void
    {
        $user = $this->user('responsable-pedagogique');
        $content = "\xEF\xBB\xBFname;code;diploma;tuition_fee;capacity\nCuisine;CUI;CAP;150000;30\nPâtisserie;PAT;CAP;;\n";

        $this->actingAs($user)->post(route('admin.formations.import'), ['file' => $this->csv($content)])
            ->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('formations', ['code' => 'CUI', 'name' => 'Cuisine', 'slug' => 'cuisine', 'diploma' => 'CAP', 'capacity' => 30]);
        $this->assertDatabaseHas('formations', ['code' => 'PAT', 'slug' => 'patisserie']);
    }

    public function test_formation_import_skips_duplicates_and_incomplete_rows(): void
    {
        $user = $this->user('responsable-pedagogique');
        Formation::create(['name' => 'Cuisine', 'code' => 'CUI', 'slug' => 'cuisine']);
        $content = "name,code\nCuisine bis,CUI\nSans code,\nService,SER\nService,SER2\n";

        $this->actingAs($user)->post(route('admin.formations.import'), ['file' => $this->csv($content)]);

        $this->assertSame(1, Formation::where('code', 'CUI')->count());
        $this->assertDatabaseHas('formations', ['code' => 'SER']);
        $this->assertDatabaseHas('formations', ['code' => 'SER2', 'slug' => 'service-ser2']);
        $this->assertSame(3, Formation::count());
    }

    public function test_subjects_are_imported_and_linked_to_a_formation_by_code_or_name(): void
    {
        $user = $this->user('responsable-pedagogique');
        $cuisine = Formation::create(['name' => 'Cuisine', 'code' => 'CUI', 'slug' => 'cuisine']);
        $content = "name,code,formation,coefficient\nHygiène,HYG,CUI,2\nTechniques,TEC,cuisine,3\nCommune,,,\nOrpheline,ORP,INCONNUE,1\n";

        $this->actingAs($user)->post(route('admin.subjects.import'), ['file' => $this->csv($content)]);

        $this->assertDatabaseHas('subjects', ['name' => 'Hygiène', 'formation_id' => $cuisine->id, 'coefficient' => 2]);
        $this->assertDatabaseHas('subjects', ['name' => 'Techniques', 'formation_id' => $cuisine->id]);
        $this->assertDatabaseHas('subjects', ['name' => 'Commune', 'formation_id' => null, 'coefficient' => 1]);
        $this->assertDatabaseMissing('subjects', ['name' => 'Orpheline']);
    }

    public function test_subject_import_does_not_duplicate_existing_subjects(): void
    {
        $user = $this->user('responsable-pedagogique');
        Subject::create(['name' => 'Hygiène', 'coefficient' => 1]);

        $this->actingAs($user)->post(route('admin.subjects.import'), ['file' => $this->csv("name\nHygiène\nHygiène\n")]);

        $this->assertSame(1, Subject::where('name', 'Hygiène')->count());
    }

    public function test_import_requires_permission_and_a_csv_file(): void
    {
        $caissier = $this->user('caissier');
        $this->actingAs($caissier)->post(route('admin.formations.import'), ['file' => $this->csv("name,code\nA,B\n")])->assertForbidden();
        $this->actingAs($caissier)->post(route('admin.subjects.import'), ['file' => $this->csv("name\nA\n")])->assertForbidden();

        $admin = User::factory()->create();
        $admin->assignRole('responsable-pedagogique');
        $this->actingAs($admin)->post(route('admin.subjects.import'), ['file' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors('file');
    }

    public function test_templates_can_be_downloaded(): void
    {
        $user = $this->user('responsable-pedagogique');

        $this->actingAs($user)->get(route('admin.formations.import.template'))->assertOk();
        $this->actingAs($user)->get(route('admin.subjects.import.template'))->assertOk();
    }
}

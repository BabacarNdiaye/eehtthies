<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Candidature;
use App\Models\Exam;
use App\Models\Expense;
use App\Models\Faq;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\LeaveRequest;
use App\Models\LoginLog;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\DataResetService;
use App\Support\DatabaseBackup;
use App\Support\DataResetCatalog;
use App\Support\DataResetException;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Mockery\MockInterface;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
use Throwable;

class DataResetTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        return $this->userWithRole('super-admin');
    }

    /** @param  string|list<string>  $roles */
    private function userWithRole(string|array $roles, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->assignRole($roles);

        return $user;
    }

    private function fakeBackup(bool $succeeds = true): void
    {
        $this->mock(DatabaseBackup::class, fn (MockInterface $mock) => $mock->shouldReceive('run')->andReturn($succeeds));
    }

    private function payload(array $categories, array $extra = []): array
    {
        return array_merge(['categories' => $categories, 'confirmation' => 'REINITIALISER', 'password' => 'password'], $extra);
    }

    /** Exécute la réinitialisation directement par le service, sauvegarde simulée. */
    private function reset(User $actor, array $categories, array $restore = []): array
    {
        $this->fakeBackup();

        return app(DataResetService::class)->run($categories, $restore, $actor);
    }

    private function insert(string $table, array $row): int
    {
        return DB::table($table)->insertGetId($row + ['created_at' => now(), 'updated_at' => now()]);
    }

    private function faq(string $question = 'Quand ?'): Faq
    {
        return Faq::create(['question' => $question, 'answer' => 'Bientôt.']);
    }

    private function student(array $attributes = []): Student
    {
        return Student::create(array_merge([
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif',
        ], $attributes));
    }

    /** @return array{0: Formation, 1: AcademicYear, 2: SchoolClass} */
    private function makeClass(): array
    {
        $year = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        return [$formation, $year, $class];
    }

    private function manualEntry(): JournalEntry
    {
        $entry = JournalEntry::create([
            'journal_id' => Journal::where('code', 'OD')->value('id'),
            'entry_date' => '2026-10-01',
            'description' => 'Écriture manuelle',
            'is_auto' => false,
        ]);

        foreach (['411000' => [100, 0], '706200' => [0, 100]] as $code => [$debit, $credit]) {
            $entry->lines()->create(['account_id' => Account::where('code', $code)->value('id'), 'label' => 'Manuelle', 'debit' => $debit, 'credit' => $credit]);
        }

        return $entry;
    }

    // ───────────────────────── Accès et validation ─────────────────────────

    public function test_only_the_super_admin_can_open_or_run_the_reset(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->withoutVite();
        $this->faq();

        $this->get(route('admin.settings.reset.index'))->assertRedirect(route('login'));

        foreach (['administration', 'direction', 'comptable'] as $role) {
            $user = $this->userWithRole($role);

            $this->actingAs($user)->get(route('admin.settings.reset.index'))->assertForbidden();
            $this->actingAs($user)->post(route('admin.settings.reset.store'), $this->payload(['faq']))->assertForbidden();
        }

        $this->assertSame(1, Faq::count());

        $this->actingAs($this->superAdmin())->get(route('admin.settings.reset.index'))->assertOk();
    }

    public function test_overview_lists_every_category_with_counts_and_automatic_dependencies(): void
    {
        $this->faq('Q1');
        $this->faq('Q2');

        $overview = app(DataResetService::class)->overview(User::factory()->create());
        $categories = collect($overview)->flatMap(fn (array $group) => $group['categories'])->keyBy('key');

        $this->assertCount(count(DataResetCatalog::keys()), $categories);
        $this->assertSame(2, $categories['faq']['count']);
        $this->assertSame(['faqs' => 2], $categories['faq']['counts']);
        $this->assertSame('optional', $categories['faq']['restore']);
        $this->assertSame('forced', $categories['plan_comptable']['restore']);
        $this->assertNull($categories['actualites']['restore']);
        $this->assertContains('examens', $categories['classes']['includes']);
        $this->assertContains('connect', $categories['classes']['includes']);
        $this->assertSame([], $categories['faq']['includes']);
    }

    public function test_invalid_requests_delete_nothing_and_never_trigger_a_backup(): void
    {
        $admin = $this->superAdmin();
        $this->faq();
        $this->mock(DatabaseBackup::class, fn (MockInterface $mock) => $mock->shouldNotReceive('run'));

        $post = fn (array $data) => $this->actingAs($admin)->post(route('admin.settings.reset.store'), $data);

        $post($this->payload([]))->assertSessionHasErrors('categories');
        $post($this->payload(['inconnue']))->assertSessionHasErrors('categories.0');
        $post($this->payload(['faq'], ['confirmation' => 'oui']))->assertSessionHasErrors('confirmation');
        $post($this->payload(['faq'], ['password' => 'mauvais']))->assertSessionHasErrors('password');

        $this->assertSame(1, Faq::count());
    }

    public function test_the_endpoint_is_throttled(): void
    {
        $admin = $this->superAdmin();

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($admin)->post(route('admin.settings.reset.store'), [])->assertSessionHasErrors();
        }

        $this->actingAs($admin)->post(route('admin.settings.reset.store'), [])->assertStatus(429);
    }

    public function test_a_confirmed_request_resets_the_selected_categories_only(): void
    {
        $admin = $this->superAdmin();
        $this->faq('Q1');
        $this->faq('Q2');
        $this->insert('contact_messages', ['name' => 'A', 'email' => 'a@b.sn', 'message' => 'Bonjour']);
        $this->fakeBackup();

        $response = $this->actingAs($admin)->post(
            route('admin.settings.reset.store'),
            $this->payload(['faq'], ['confirmation' => ' reinitialiser '])
        );

        $response->assertRedirect(route('admin.settings.reset.index'));
        $response->assertSessionHas('success');
        $this->assertSame(0, Faq::count());
        $this->assertSame(1, DB::table('contact_messages')->count());
    }

    // ───────────────────────── Sauvegarde, échec, journal ─────────────────────────

    public function test_the_backup_runs_before_anything_is_deleted(): void
    {
        $admin = $this->superAdmin();
        $this->faq();
        $this->mock(DatabaseBackup::class, fn (MockInterface $mock) => $mock->shouldReceive('run')->once()->andReturnUsing(function () {
            $this->assertSame(1, Faq::count(), 'La sauvegarde doit précéder toute suppression.');

            return true;
        }));

        app(DataResetService::class)->run(['faq'], [], $admin);

        $this->assertSame(0, Faq::count());
    }

    public function test_a_failed_backup_aborts_everything(): void
    {
        $admin = $this->superAdmin();
        $this->faq();
        $this->mock(DatabaseBackup::class, fn (MockInterface $mock) => $mock->shouldReceive('run')->once()->andReturn(false));

        $this->actingAs($admin)->post(route('admin.settings.reset.store'), $this->payload(['faq']))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(1, Faq::count());
        $this->assertSame(0, Activity::where('description', 'like', 'Réinitialisation%')->count());
    }

    public function test_a_failure_rolls_back_every_deletion_and_keeps_the_files(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        Storage::disk('public')->put('news/a.jpg', 'x');
        $this->insert('news_articles', ['title' => 'A', 'slug' => 'a', 'content' => 'x', 'image' => 'news/a.jpg']);
        $this->faq();
        DB::unprepared("CREATE TRIGGER faqs_block BEFORE DELETE ON faqs BEGIN SELECT RAISE(ABORT, 'blocage de test'); END;");
        $this->fakeBackup();

        try {
            app(DataResetService::class)->run(['actualites', 'faq'], [], $admin);
            $this->fail('Une DataResetException était attendue.');
        } catch (DataResetException $e) {
            $this->assertStringContainsString('Aucune donnée', $e->getMessage());
        }

        $this->assertSame(1, DB::table('news_articles')->count());
        $this->assertSame(1, Faq::count());
        Storage::disk('public')->assertExists('news/a.jpg');
    }

    public function test_the_reset_is_logged_and_the_entry_survives_resetting_the_activity_log(): void
    {
        $admin = $this->superAdmin();
        activity()->log('ancienne entrée');
        $this->assertGreaterThan(0, Activity::count());

        $this->reset($admin, ['journal_activite']);

        $this->assertSame(1, Activity::count());
        $entry = Activity::first();
        $this->assertStringContainsString('Réinitialisation', $entry->description);
        $this->assertSame($admin->id, $entry->causer_id);
        $this->assertSame('administration', $entry->log_name);
        $this->assertSame(['journal_activite'], $entry->properties->get('categories'));
    }

    public function test_the_backup_wrapper_reports_the_outcome_and_never_throws(): void
    {
        $outcomes = [0, 1, new RuntimeException('mysqldump introuvable')];

        Artisan::shouldReceive('call')->times(3)->with('backup:run', ['--only-db' => true])->andReturnUsing(function () use (&$outcomes) {
            $outcome = array_shift($outcomes);

            if ($outcome instanceof Throwable) {
                throw $outcome;
            }

            return $outcome;
        });

        $backup = new DatabaseBackup;

        $this->assertTrue($backup->run());
        $this->assertFalse($backup->run());
        $this->assertFalse($backup->run());
    }

    // ───────────────────────── Suppression, dépendances, fichiers ─────────────────────────

    public function test_resetting_the_news_removes_rows_and_files_but_not_other_content(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        Storage::disk('public')->put('news/a.jpg', 'x');
        Storage::disk('public')->put('news/photos/p.jpg', 'x');
        $article = $this->insert('news_articles', ['title' => 'A', 'slug' => 'a', 'content' => 'x', 'image' => 'news/a.jpg']);
        $this->insert('news_article_photos', ['news_article_id' => $article, 'path' => 'news/photos/p.jpg']);
        $this->faq();

        $result = $this->reset($admin, ['actualites']);

        $this->assertSame(0, DB::table('news_articles')->count());
        $this->assertSame(0, DB::table('news_article_photos')->count());
        Storage::disk('public')->assertMissing('news/a.jpg');
        Storage::disk('public')->assertMissing('news/photos/p.jpg');
        $this->assertSame(1, Faq::count());
        $this->assertSame(['actualites'], $result['categories']);
        $this->assertSame(2, $result['rows']);
        $this->assertSame(2, $result['files']);
    }

    public function test_external_links_and_missing_files_never_block_the_reset(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        $gallery = $this->insert('galleries', ['title' => 'G', 'slug' => 'g', 'cover_image' => 'galleries/absente.jpg']);
        $this->insert('gallery_media', ['gallery_id' => $gallery, 'type' => 'video', 'path' => 'https://www.youtube.com/watch?v=abc']);
        $this->insert('gallery_media', ['gallery_id' => $gallery, 'type' => 'image', 'path' => 'galleries/1/x.jpg']);

        $this->reset($admin, ['galerie']);

        $this->assertSame(0, DB::table('galleries')->count());
        $this->assertSame(0, DB::table('gallery_media')->count());
    }

    /**
     * Sur l'hébergement, le code peut être en ligne avant que la migration correspondante soit lancée (elle
     * passe par un cron ponctuel) : une table ou une colonne absente ne doit pas rendre l'écran inutilisable.
     */
    public function test_tables_and_columns_missing_because_of_pending_migrations_are_skipped(): void
    {
        $admin = $this->superAdmin();
        $this->faq();
        Schema::drop('message_mentions');
        Schema::drop('attachments');
        Schema::table('conversations', fn ($table) => $table->dropColumn('avatar_path'));

        $overview = app(DataResetService::class)->overview($admin);
        $connect = collect($overview)->flatMap(fn (array $group) => $group['categories'])->firstWhere('key', 'connect');
        $this->assertSame(0, $connect['counts']['message_mentions']);

        $result = $this->reset($admin, ['connect', 'depenses', 'faq']);

        $this->assertSame(0, Faq::count());
        $this->assertContains('depenses', $result['categories']);
    }

    public function test_resetting_classes_also_removes_what_depends_on_them_and_keeps_the_students(): void
    {
        $admin = $this->superAdmin();
        [$formation, , $class] = $this->makeClass();
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id]);
        $student = $this->student(['formation_id' => $formation->id, 'school_class_id' => $class->id]);
        $exam = Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $class->id, 'subject_id' => $subject->id,
            'term' => 'Semestre 1', 'exam_date' => now(), 'max_score' => 20, 'coefficient' => 1, 'is_published' => true,
        ]);
        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => 12, 'is_absent' => false]);

        $result = $this->reset($admin, ['classes']);

        $this->assertSame(0, SchoolClass::count());
        $this->assertSame(0, Exam::count());
        $this->assertSame(0, Grade::count());
        $this->assertNull($student->fresh()->school_class_id);
        $this->assertSame(1, Formation::count());
        $this->assertSame(1, AcademicYear::count());
        $this->assertContains('examens', $result['categories']);
        $this->assertContains('connect', $result['categories']);
        $this->assertSame('classes', end($result['categories']));
    }

    public function test_resetting_students_removes_their_invoices_payments_and_automatic_entries_only(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        $this->seed(AccountingSeeder::class);
        Storage::disk('public')->put('students/photos/a.jpg', 'x');
        $student = $this->student(['photo' => 'students/photos/a.jpg']);
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000, 'discount' => 0]);
        $invoice->payments()->create(['amount' => 10000, 'method' => 'especes', 'paid_at' => now()]);
        $manual = $this->manualEntry();
        $this->assertGreaterThan(0, JournalEntry::where('is_auto', true)->count(), 'Garde-fou : le comptable automatique doit avoir écrit.');

        $this->reset($admin, ['eleves']);

        $this->assertSame(0, Student::count());
        $this->assertSame(0, Invoice::count());
        $this->assertSame(0, Payment::count());
        $this->assertSame(0, JournalEntry::where('is_auto', true)->count());
        $this->assertTrue(JournalEntry::whereKey($manual->id)->exists());
        $this->assertSame(2, $manual->lines()->count());
        Storage::disk('public')->assertMissing('students/photos/a.jpg');
    }

    public function test_resetting_invoices_keeps_students_and_manual_entries(): void
    {
        $admin = $this->superAdmin();
        $this->seed(AccountingSeeder::class);
        $student = $this->student();
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000, 'discount' => 0]);
        $invoice->payments()->create(['amount' => 10000, 'method' => 'especes', 'paid_at' => now()]);
        $manual = $this->manualEntry();

        $this->reset($admin, ['factures']);

        $this->assertSame(1, Student::count());
        $this->assertSame(0, Invoice::count());
        $this->assertSame(0, Payment::count());
        $this->assertSame(0, JournalEntry::where('is_auto', true)->count());
        $this->assertTrue(JournalEntry::whereKey($manual->id)->exists());
    }

    public function test_attachments_are_removed_only_for_the_reset_models(): void
    {
        Storage::fake('local');
        $admin = $this->superAdmin();
        $student = $this->student();
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000, 'discount' => 0]);
        $expense = Expense::create(['category' => 'achats', 'label' => 'Papier', 'amount' => 5000, 'expense_date' => '2026-10-01', 'payment_method' => 'especes']);
        Storage::disk('local')->put('attachments/expense/1/e.pdf', 'x');
        Storage::disk('local')->put('attachments/invoice/1/i.pdf', 'x');
        Attachment::create(['attachable_type' => Expense::class, 'attachable_id' => $expense->id, 'original_name' => 'e.pdf', 'file_path' => 'attachments/expense/1/e.pdf', 'mime_type' => 'application/pdf', 'size' => 1]);
        Attachment::create(['attachable_type' => Invoice::class, 'attachable_id' => $invoice->id, 'original_name' => 'i.pdf', 'file_path' => 'attachments/invoice/1/i.pdf', 'mime_type' => 'application/pdf', 'size' => 1]);

        $this->reset($admin, ['depenses']);

        $this->assertSame(0, Expense::count());
        $this->assertSame(1, Invoice::count());
        $this->assertSame(1, Attachment::count());
        Storage::disk('local')->assertMissing('attachments/expense/1/e.pdf');
        Storage::disk('local')->assertExists('attachments/invoice/1/i.pdf');
    }

    public function test_connect_attachments_are_removed_from_whichever_disk_holds_them(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $admin = $this->superAdmin();
        Storage::disk('local')->put('connect/1/a.pdf', 'x');
        Storage::disk('public')->put('connect/ancien/b.pdf', 'x');
        Storage::disk('public')->put('connect-groups/g.jpg', 'x');
        $conversation = $this->insert('conversations', ['type' => 'group', 'name' => 'G', 'avatar_path' => 'connect-groups/g.jpg']);
        $this->insert('conversation_messages', ['conversation_id' => $conversation, 'body' => 'x', 'attachment_path' => 'connect/1/a.pdf']);
        $this->insert('conversation_messages', ['conversation_id' => $conversation, 'body' => 'y', 'attachment_path' => 'connect/ancien/b.pdf']);

        $this->reset($admin, ['connect']);

        $this->assertSame(0, DB::table('conversations')->count());
        $this->assertSame(0, DB::table('conversation_messages')->count());
        Storage::disk('local')->assertMissing('connect/1/a.pdf');
        Storage::disk('public')->assertMissing('connect/ancien/b.pdf');
        Storage::disk('public')->assertMissing('connect-groups/g.jpg');
    }

    public function test_resetting_candidatures_removes_their_documents_from_the_media_library(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $candidature = Candidature::create(['formation_id' => $formation->id, 'first_name' => 'Awa', 'last_name' => 'Test', 'email' => 'awa@test.sn', 'phone' => '770000000']);
        $candidature->addMedia(UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'))->toMediaCollection('documents');
        $this->assertSame(1, Media::count());
        $this->assertNotEmpty(Storage::disk('public')->allFiles());

        $this->reset($admin, ['candidatures']);

        $this->assertSame(0, Candidature::count());
        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    // ───────────────────────── Comptabilité, réglages, comptes ─────────────────────────

    public function test_resetting_the_chart_of_accounts_reloads_the_default_journals_and_accounts(): void
    {
        $admin = $this->superAdmin();
        $this->seed(AccountingSeeder::class);
        Account::create(['code' => '999999', 'name' => 'Compte personnalisé', 'class' => 9, 'nature' => 'actif']);
        $this->manualEntry();

        $result = $this->reset($admin, ['plan_comptable']);

        $this->assertSame(0, JournalEntry::count());
        $this->assertFalse(Account::where('code', '999999')->exists());
        $this->assertTrue(Account::where('code', '411000')->exists());
        $this->assertTrue(Journal::where('code', 'VTE')->exists());
        $this->assertContains('plan_comptable', $result['restored']);
    }

    public function test_settings_reset_uses_a_whitelist_and_clears_the_cache(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();
        Storage::disk('public')->put('settings/logo.png', 'x');
        Setting::set('site_name', 'EEHT Test');
        Setting::set('site_phone', '770000000');
        Setting::set('theme_primary_color', '#123456');
        Setting::set('site_logo', 'settings/logo.png');
        Setting::set('reset_import_graduates_2026_done', '{"ran":true}');
        $this->assertSame('EEHT Test', Setting::get('site_name')); // amorce le cache

        $this->reset($admin, ['reglages_identite']);

        $this->assertSame('EEHT de Thiès', Setting::get('site_name', 'EEHT de Thiès'));
        $this->assertNull(Setting::where('key', 'site_phone')->first());
        $this->assertNotNull(Setting::where('key', 'theme_primary_color')->first());
        $this->assertNotNull(Setting::where('key', 'reset_import_graduates_2026_done')->first(), 'Le verrou d\'une commande ponctuelle ne doit jamais être effacé.');
        Storage::disk('public')->assertExists('settings/logo.png');

        $this->reset($admin, ['reglages_images']);

        $this->assertNull(Setting::where('key', 'site_logo')->first());
        Storage::disk('public')->assertMissing('settings/logo.png');
        $this->assertNotNull(Setting::where('key', 'reset_import_graduates_2026_done')->first());
    }

    public function test_portal_accounts_reset_removes_only_portal_only_accounts(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $admin = $this->superAdmin();
        $seededAdmin = User::where('email', 'admin@eeht-thies.sn')->firstOrFail();
        $eleve = $this->userWithRole('eleve', ['avatar' => 'avatars/e.jpg']);
        $parent = $this->userWithRole('parent');
        $teacher = $this->userWithRole('enseignant');
        $comptable = $this->userWithRole('comptable');
        $mixed = $this->userWithRole(['enseignant', 'comptable']);
        Storage::disk('public')->put('avatars/e.jpg', 'x');
        $student = $this->student();
        DB::table('students')->where('id', $student->id)->update(['user_id' => $eleve->id, 'parent_user_id' => $parent->id]);
        LoginLog::create(['user_id' => $teacher->id, 'ip_address' => '127.0.0.1']);
        $leave = LeaveRequest::create(['user_id' => $teacher->id, 'type' => 'conge_paye', 'start_date' => '2026-10-10', 'end_date' => '2026-10-12']);
        Storage::disk('local')->put('attachments/leave/1/c.pdf', 'x');
        Attachment::create(['attachable_type' => LeaveRequest::class, 'attachable_id' => $leave->id, 'original_name' => 'c.pdf', 'file_path' => 'attachments/leave/1/c.pdf', 'mime_type' => 'application/pdf', 'size' => 1]);
        $rolesBefore = Role::count();

        $this->reset($admin, ['comptes_portail']);

        $remaining = User::pluck('id')->all();
        $this->assertEqualsCanonicalizing([$admin->id, $seededAdmin->id, $comptable->id, $mixed->id], $remaining);
        $this->assertSame(0, DB::table('model_has_roles')->where('model_type', User::class)->whereNotIn('model_id', $remaining)->count());
        $student->refresh();
        $this->assertNull($student->user_id);
        $this->assertNull($student->parent_user_id);
        $this->assertSame(0, LeaveRequest::count());
        $this->assertSame(0, Attachment::count());
        $this->assertSame(0, LoginLog::count());
        Storage::disk('public')->assertMissing('avatars/e.jpg');
        Storage::disk('local')->assertMissing('attachments/leave/1/c.pdf');
        $this->assertSame($rolesBefore, Role::count());
        $this->assertTrue($admin->fresh()->hasRole('super-admin'));
    }

    public function test_optional_restore_reloads_the_faq_catalog(): void
    {
        $admin = $this->superAdmin();
        $this->faq();

        $this->reset($admin, ['faq']);
        $this->assertSame(0, Faq::count());

        $result = $this->reset($admin, ['faq'], ['faq']);

        $this->assertGreaterThan(0, Faq::count());
        $this->assertSame(['faq'], $result['restored']);
    }
}

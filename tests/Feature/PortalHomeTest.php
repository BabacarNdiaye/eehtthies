<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\NewsArticle;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Services\PortalFeed;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Données de l'accueil des espaces élève, parent et enseignant : prochain cours, matières avec moyenne, solde à
 * payer, annonces. Les moyennes suivent les mêmes règles que les bulletins (épreuves publiées, ramenées sur 20,
 * pondérées par coefficient).
 */
class PortalHomeTest extends TestCase
{
    use RefreshDatabase;

    private Formation $formation;

    private SchoolClass $class;

    private Subject $cuisine;

    private Subject $anglais;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-05 09:30:00')); // un lundi

        $year = AcademicYear::create(['label' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $year->id]);
        $this->cuisine = Subject::create(['name' => 'Cuisine', 'formation_id' => $this->formation->id, 'coefficient' => 2]);
        $this->anglais = Subject::create(['name' => 'Anglais', 'formation_id' => $this->formation->id, 'coefficient' => 1]);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function student(array $attributes = []): Student
    {
        return Student::create(array_merge([
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif',
            'school_class_id' => $this->class->id, 'formation_id' => $this->formation->id,
        ], $attributes));
    }

    private function entry(Subject $subject, int $day, string $start, string $end, ?Teacher $teacher = null): TimetableEntry
    {
        return TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher?->id,
            'day_of_week' => $day, 'start_time' => $start, 'end_time' => $end,
        ]);
    }

    private function graded(Student $student, Subject $subject, float $score, float $max = 20, bool $published = true): void
    {
        $exam = Exam::create([
            'title' => 'Devoir', 'type' => 'devoir', 'school_class_id' => $this->class->id, 'subject_id' => $subject->id,
            'term' => 'Semestre 1', 'exam_date' => now(), 'max_score' => $max, 'coefficient' => 1, 'is_published' => $published,
        ]);

        Grade::create(['exam_id' => $exam->id, 'student_id' => $student->id, 'score' => $score, 'is_absent' => false]);
    }

    private function invoice(Student $student, float $amount, float $paid = 0): Invoice
    {
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => $amount, 'discount' => 0]);

        if ($paid > 0) {
            $invoice->payments()->create(['amount' => $paid, 'method' => 'especes', 'paid_at' => now()]);
        }

        return $invoice;
    }

    private function announce(User $to, string $title, bool $read = false, ?Carbon $createdAt = null): Announcement
    {
        $announcement = Announcement::create([
            'title' => $title, 'body' => "<p>Texte de « {$title} »</p>", 'priority' => 'normale',
            'audience_type' => 'ecole', 'created_by' => User::factory()->create()->id,
        ]);

        if ($createdAt) {
            DB::table('announcements')->where('id', $announcement->id)->update(['created_at' => $createdAt]);
        }

        $to->announcementsReceived()->attach($announcement->id, $read ? ['read_at' => now()] : []);

        return $announcement;
    }

    // ───────────────────────── Élève ─────────────────────────

    public function test_student_home_summarises_subjects_averages_balance_and_next_class(): void
    {
        $user = $this->userWithRole('eleve');
        $student = $this->student(['user_id' => $user->id]);
        $teacher = Teacher::create(['matricule' => 'ENS-1', 'first_name' => 'Moussa', 'last_name' => 'Ba']);
        $this->entry($this->cuisine, 1, '09:00', '11:00', $teacher);
        $this->entry($this->anglais, 1, '14:00', '16:00');
        $this->entry($this->cuisine, 2, '08:00', '10:00');
        $this->graded($student, $this->cuisine, 14);
        $this->graded($student, $this->cuisine, 2, published: false); // brouillon : ignoré
        $this->graded($student, $this->anglais, 8, max: 10);          // 8/10 == 16/20
        $this->invoice($student, 25000, paid: 10000);
        $this->invoice($student, 5000, paid: 5000);
        $this->announce($user, 'Rentrée');

        $this->actingAs($user)->get(route('student.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Student/Dashboard')
            ->where('nextClass.state', 'ongoing')
            ->where('nextClass.day_label', 'Lundi')
            ->where('nextClass.entry.subject.name', 'Cuisine')
            ->where('nextClass.entry.teacher.last_name', 'Ba')
            ->has('todayEntries', 2)
            ->has('weekEntries', 3)
            ->has('subjects', 2)
            ->where('subjects.0.name', 'Anglais')
            ->where('subjects.0.average', fn ($value) => (float) $value === 16.0)
            ->where('subjects.1.name', 'Cuisine')
            ->where('subjects.1.average', fn ($value) => (float) $value === 14.0)
            ->where('subjects.1.teacher', 'Moussa Ba')
            ->where('overallAverage', fn ($value) => (float) $value === 14.67) // (14×2 + 16×1) / 3
            ->where('balanceDue', fn ($value) => (float) $value === 15000.0)
            ->has('announcements', 1)
            ->where('announcements.0.title', 'Rentrée')
            ->where('announcements.0.unread', true));
    }

    public function test_a_student_without_a_class_gets_empty_home_lists(): void
    {
        $user = $this->userWithRole('eleve');
        $this->student(['user_id' => $user->id, 'school_class_id' => null]);

        $this->actingAs($user)->get(route('student.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('nextClass', null)
            ->has('todayEntries', 0)
            ->has('weekEntries', 0)
            ->has('subjects', 0)
            ->where('overallAverage', null)
            ->where('balanceDue', fn ($value) => (float) $value === 0.0)
            ->has('announcements', 0));
    }

    public function test_the_balance_due_ignores_overpayments_and_paid_invoices(): void
    {
        $student = $this->student();
        $this->invoice($student, 1000, paid: 1500); // trop-perçu : ne compense pas les autres factures
        $this->invoice($student, 2000);

        $this->assertSame(2000.0, $student->balanceDue());
    }

    // ───────────────────────── Fil « À la une » ─────────────────────────

    public function test_the_feed_has_only_the_users_announcements_unread_first_then_published_news(): void
    {
        $user = $this->userWithRole('eleve');
        $other = $this->userWithRole('eleve');
        $this->announce($user, 'Annonce lue', read: true);                                      // la plus récente, mais déjà lue
        $this->announce($user, 'Annonce non lue', createdAt: now()->subDay());
        $this->announce($other, 'Annonce de quelqu\'un d\'autre');
        NewsArticle::create(['title' => 'Actualité récente', 'content' => 'x', 'is_published' => true, 'published_at' => now()->subDay()]);
        NewsArticle::create(['title' => 'Actualité ancienne', 'content' => 'x', 'is_published' => true, 'published_at' => now()->subWeek()]);
        NewsArticle::create(['title' => 'Brouillon', 'content' => 'x', 'is_published' => false]);

        $feed = collect(app(PortalFeed::class)->forUser($user, 4));

        $this->assertSame(['Annonce non lue', 'Annonce lue', 'Actualité récente', 'Actualité ancienne'], $feed->pluck('title')->all());
        $this->assertSame(['announcement', 'announcement', 'news', 'news'], $feed->pluck('kind')->all());
        $this->assertSame([true, false, false, false], $feed->pluck('unread')->all());
        $this->assertSame(route('connect.index', ['section' => 'announcements']), $feed[0]['url']);
        $this->assertStringContainsString('/actualites/', $feed[2]['url']);
        $this->assertSame('Texte de « Annonce non lue »', $feed[0]['excerpt']);
        $this->assertCount(3, app(PortalFeed::class)->forUser($user, 3));
    }

    public function test_the_feed_is_empty_without_announcements_or_news(): void
    {
        $this->assertSame([], app(PortalFeed::class)->forUser($this->userWithRole('eleve')));
    }

    // ───────────────────────── Parent ─────────────────────────

    public function test_parent_home_lists_only_own_children_with_summaries(): void
    {
        $parent = $this->userWithRole('parent');
        $child = $this->student(['parent_user_id' => $parent->id, 'first_name' => 'Fatou']);
        $this->student(['parent_user_id' => $this->userWithRole('parent')->id, 'first_name' => 'Autre']);
        $this->entry($this->cuisine, 1, '09:00', '11:00');
        $this->graded($child, $this->cuisine, 14);
        $this->invoice($child, 25000, paid: 10000);
        foreach (['absent' => 0, 'absence_justifiee' => 1, 'retard' => 2] as $status => $daysAgo) {
            Attendance::create(['student_id' => $child->id, 'school_class_id' => $this->class->id, 'date' => now()->subDays($daysAgo), 'status' => $status]);
        }

        $this->actingAs($parent)->get(route('parent.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Parent/Dashboard')
            ->has('children', 1)
            ->where('children.0.first_name', 'Fatou')
            ->where('children.0.summary.average', fn ($value) => (float) $value === 14.0)
            ->where('children.0.summary.absences', 2)
            ->where('children.0.summary.balance_due', fn ($value) => (float) $value === 15000.0)
            ->where('children.0.summary.next_class.state', 'ongoing')
            ->has('announcements'));
    }

    // ───────────────────────── Enseignant ─────────────────────────

    public function test_teacher_home_has_the_next_class_the_week_and_announcements(): void
    {
        $user = $this->userWithRole('enseignant');
        $teacher = Teacher::create(['user_id' => $user->id, 'matricule' => 'ENS-2', 'first_name' => 'Awa', 'last_name' => 'Diop']);
        $this->entry($this->cuisine, 1, '09:00', '11:00', $teacher);
        $this->entry($this->cuisine, 3, '08:00', '10:00', $teacher);
        $this->entry($this->anglais, 1, '14:00', '16:00'); // un autre enseignant
        $this->announce($user, 'Réunion pédagogique');

        $this->actingAs($user)->get(route('teacher.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/Dashboard')
            ->where('nextClass.state', 'ongoing')
            ->where('nextClass.entry.school_class.name', 'BTS1') // Eloquent sérialise les relations en snake_case
            ->has('weekEntries', 2)
            ->has('announcements', 1)
            ->where('announcements.0.title', 'Réunion pédagogique'));
    }

    // ───────────────────────── Profil partagé ─────────────────────────

    public function test_portal_roles_get_a_shared_profile_for_the_menu_and_other_roles_do_not(): void
    {
        $eleveUser = $this->userWithRole('eleve');
        $this->student(['user_id' => $eleveUser->id, 'first_name' => 'Awa', 'last_name' => 'Diop', 'matricule' => 'EEHT-001', 'photo' => 'students/photos/awa.jpg']);
        $teacherUser = $this->userWithRole('enseignant');
        Teacher::create(['user_id' => $teacherUser->id, 'matricule' => 'ENS-3', 'first_name' => 'Moussa', 'last_name' => 'Ba', 'specialty' => 'Pâtisserie']);
        $parent = $this->userWithRole('parent');
        $this->student(['parent_user_id' => $parent->id]);
        $this->student(['parent_user_id' => $parent->id]);

        $this->actingAs($eleveUser)->get(route('student.dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('portalProfile.kind', 'student')
            ->where('portalProfile.name', 'Awa Diop')
            ->where('portalProfile.subtitle', 'BTS Cuisine — BTS1')
            ->where('portalProfile.matricule', 'EEHT-001')
            ->where('portalProfile.photo', '/storage/students/photos/awa.jpg'));

        $this->actingAs($teacherUser)->get(route('teacher.dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('portalProfile.kind', 'teacher')
            ->where('portalProfile.name', 'Moussa Ba')
            ->where('portalProfile.subtitle', 'Pâtisserie'));

        $this->actingAs($parent)->get(route('parent.dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('portalProfile.kind', 'parent')
            ->where('portalProfile.subtitle', '2 enfants'));

        $this->actingAs($this->userWithRole('super-admin'))->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('portalProfile', null));
    }

    // ───────────────────────── Accès ─────────────────────────

    public function test_each_home_stays_reserved_to_its_own_role(): void
    {
        $eleve = $this->userWithRole('eleve');
        $this->student(['user_id' => $eleve->id]);

        $this->actingAs($eleve)->get(route('parent.dashboard'))->assertForbidden();
        $this->actingAs($eleve)->get(route('teacher.dashboard'))->assertForbidden();
        $this->actingAs($this->userWithRole('enseignant'))->get(route('student.dashboard'))->assertForbidden();
        $this->actingAs($this->userWithRole('parent'))->get(route('student.dashboard'))->assertForbidden();

        auth()->logout();
        $this->get(route('student.dashboard'))->assertRedirect(route('login'));
    }
}

<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Recherche globale de l'administration (palette Ctrl/⌘ K) : élèves, enseignants, candidatures et factures. Elle
 * ouvre des fiches contenant des données personnelles : chaque famille de résultats suit donc la permission de
 * consultation de sa liste, et rien n'est renvoyé aux comptes qui n'ont pas le droit de les voir.
 */
class AdminSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(AccountingSeeder::class);
    }

    private function staff(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function student(string $first, string $last, string $matricule): Student
    {
        return Student::create(['matricule' => $matricule, 'first_name' => $first, 'last_name' => $last]);
    }

    private function search(User $user, string $query)
    {
        return $this->actingAs($user)->getJson(route('admin.search', ['q' => $query]));
    }

    public function test_it_finds_students_by_name_in_any_order_and_by_matricule(): void
    {
        $this->student('Awa', 'Diop', 'EEHT-001');
        $this->student('Moussa', 'Diop', 'EEHT-002');
        $this->student('Fatou', 'Sarr', 'EEHT-003');
        $admin = $this->staff('super-admin');

        $this->search($admin, 'diop')->assertOk()->assertJsonCount(2, 'students');
        $this->search($admin, 'awa diop')->assertOk()->assertJsonCount(1, 'students')->assertJsonPath('students.0.label', 'Awa Diop');
        $this->search($admin, 'diop awa')->assertOk()->assertJsonCount(1, 'students');
        $this->search($admin, 'EEHT-003')->assertOk()->assertJsonPath('students.0.label', 'Fatou Sarr');
    }

    public function test_a_result_carries_a_relative_link_to_its_page_and_a_hint(): void
    {
        $student = $this->student('Awa', 'Diop', 'EEHT-001');

        $response = $this->search($this->staff('super-admin'), 'awa');

        $response->assertOk()
            ->assertJsonPath('students.0.id', $student->id)
            ->assertJsonPath('students.0.href', "/admin/students/{$student->id}/edit");
        $this->assertStringContainsString('EEHT-001', $response->json('students.0.hint'));
    }

    public function test_a_query_shorter_than_two_characters_returns_nothing(): void
    {
        $this->student('Awa', 'Diop', 'EEHT-001');

        $this->search($this->staff('super-admin'), 'a')
            ->assertOk()
            ->assertExactJson(['students' => [], 'teachers' => [], 'candidatures' => [], 'invoices' => []]);
        $this->search($this->staff('super-admin'), '   ')->assertOk()->assertJsonCount(0, 'students');
    }

    public function test_it_finds_teachers_candidatures_and_invoices(): void
    {
        $teacher = Teacher::create(['matricule' => 'PROF-1', 'first_name' => 'Ibrahima', 'last_name' => 'Fall']);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $candidature = Candidature::create([
            'first_name' => 'Khady', 'last_name' => 'Mbaye', 'status' => 'soumise', 'email' => 'khady@example.test',
            'phone' => '770000000', 'formation_id' => $formation->id,
        ]);
        $student = $this->student('Awa', 'Diop', 'EEHT-001');
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité octobre', 'amount' => 35000, 'discount' => 0]);
        $admin = $this->staff('super-admin');

        $this->search($admin, 'ibrahima')->assertJsonPath('teachers.0.href', "/admin/teachers/{$teacher->id}/edit");
        $this->search($admin, 'khady')->assertJsonPath('candidatures.0.href', "/admin/candidatures/{$candidature->id}");
        $this->search($admin, $invoice->reference)->assertJsonPath('invoices.0.href', "/admin/invoices/{$invoice->id}");
        // Une facture se retrouve aussi par le nom de l'élève.
        $this->search($admin, 'diop')->assertJsonPath('invoices.0.href', "/admin/invoices/{$invoice->id}");
    }

    public function test_invoices_are_filtered_by_the_words_typed(): void
    {
        $awa = $this->student('Awa', 'Diop', 'EEHT-001');
        $fatou = $this->student('Fatou', 'Sarr', 'EEHT-002');
        $awaInvoice = Invoice::create(['student_id' => $awa->id, 'type' => 'mensualite', 'label' => 'Mensualité octobre', 'amount' => 35000, 'discount' => 0]);
        Invoice::create(['student_id' => $fatou->id, 'type' => 'inscription', 'label' => 'Frais de dossier', 'amount' => 20000, 'discount' => 0]);
        $admin = $this->staff('super-admin');

        // Un mot qui ne figure nulle part ne ramène aucune facture (la recherche par élève ne doit pas tout laisser passer).
        $this->search($admin, 'zzzz')->assertOk()->assertJsonCount(0, 'invoices');
        // Le nom d'un élève ne ramène que les factures de cet élève.
        $this->search($admin, 'diop')->assertJsonCount(1, 'invoices')->assertJsonPath('invoices.0.href', "/admin/invoices/{$awaInvoice->id}");
        // Chaque mot doit se retrouver, ici l'un dans le nom de l'élève et l'autre dans le libellé.
        $this->search($admin, 'diop octobre')->assertJsonCount(1, 'invoices');
        $this->search($admin, 'sarr octobre')->assertJsonCount(0, 'invoices');
    }

    public function test_each_family_follows_the_permission_of_its_list(): void
    {
        $student = $this->student('Awa', 'Diop', 'EEHT-001');
        Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 35000, 'discount' => 0]);

        // Le caissier voit la comptabilité, pas les dossiers d'élèves.
        $cashier = $this->search($this->staff('caissier'), 'diop');
        $cashier->assertOk()->assertJsonCount(0, 'students')->assertJsonCount(1, 'invoices');

        // Le responsable des stocks ne voit aucune de ces familles.
        $stock = $this->search($this->staff('responsable-stocks'), 'diop');
        $stock->assertOk()->assertExactJson(['students' => [], 'teachers' => [], 'candidatures' => [], 'invoices' => []]);

        // Le responsable pédagogique voit les élèves mais pas la comptabilité.
        $pedagogy = $this->search($this->staff('responsable-pedagogique'), 'diop');
        $pedagogy->assertOk()->assertJsonCount(1, 'students')->assertJsonCount(0, 'invoices');
    }

    public function test_like_wildcards_are_matched_literally(): void
    {
        $this->student('Aminata', 'Diop', 'EEHT-001');
        $this->student('A_inata', 'Test', 'EEHT-002');
        $this->student('100% Motivé', 'Test', 'EEHT-003');
        $admin = $this->staff('super-admin');

        // « a_ » ne doit pas jouer « un caractère quelconque » : seul le prénom contenant vraiment « a_ » répond.
        $this->search($admin, 'a_')->assertJsonCount(1, 'students')->assertJsonPath('students.0.label', 'A_inata Test');
        // « % » seul ne ramène pas toute la base.
        $this->search($admin, '%%')->assertJsonCount(0, 'students');
        $this->search($admin, '100%')->assertJsonCount(1, 'students');
    }

    public function test_each_family_is_limited_to_five_results(): void
    {
        foreach (range(1, 8) as $number) {
            $this->student("Élève{$number}", 'Commun', "EEHT-10{$number}");
        }

        $this->search($this->staff('super-admin'), 'commun')->assertOk()->assertJsonCount(5, 'students');
    }

    public function test_guests_and_non_staff_accounts_cannot_search(): void
    {
        $this->getJson(route('admin.search', ['q' => 'diop']))->assertUnauthorized();

        $student = User::factory()->create();
        $student->assignRole('eleve');
        $this->actingAs($student)->getJson(route('admin.search', ['q' => 'diop']))->assertForbidden();
    }
}

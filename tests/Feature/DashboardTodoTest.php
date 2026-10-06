<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\ContactMessage;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Bloc « À traiter » du tableau de bord : ce qui attend une décision du personnel (candidatures, impayés, congés à
 * valider, messages non lus). Chaque chiffre n'est calculé et envoyé que si le rôle a le droit de voir la page vers
 * laquelle il renvoie ; les impayés suivent la même règle que la page « Situation des impayés ».
 */
class DashboardTodoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(AccountingSeeder::class);
    }

    private function staff(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function seedWork(): void
    {
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);

        foreach (['soumise', 'dossier_incomplet', 'acceptee', 'refusee', 'brouillon'] as $status) {
            Candidature::create([
                'first_name' => 'Awa', 'last_name' => ucfirst($status), 'status' => $status, 'email' => "{$status}@example.test",
                'phone' => '770000000', 'formation_id' => $formation->id,
            ]);
        }

        $student = Student::create(['matricule' => 'EEHT-001', 'first_name' => 'Awa', 'last_name' => 'Diop']);

        // 50 000 − 5 000 de remise − 20 000 payés = 25 000 restants.
        $partial = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 50000, 'discount' => 5000]);
        $partial->payments()->create(['amount' => 20000, 'method' => 'especes', 'paid_at' => now()]);
        // Soldée : ne compte pas.
        $paid = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Inscription', 'amount' => 10000, 'discount' => 0]);
        $paid->payments()->create(['amount' => 10000, 'method' => 'especes', 'paid_at' => now()]);
        // Impayée entièrement : 35 000 restants.
        Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Novembre', 'amount' => 35000, 'discount' => 0]);

        $requester = User::factory()->create();
        LeaveRequest::create(['user_id' => $requester->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);
        LeaveRequest::create(['user_id' => $requester->id, 'type' => 'conge_paye', 'start_date' => '2026-11-01', 'end_date' => '2026-11-02', 'status' => 'approuve']);

        ContactMessage::create(['name' => 'Visiteur', 'email' => 'v@example.test', 'subject' => 'Bonjour', 'message' => 'Question', 'is_read' => false]);
        ContactMessage::create(['name' => 'Autre', 'email' => 'a@example.test', 'subject' => 'Déjà lu', 'message' => 'Question', 'is_read' => true]);
    }

    public function test_the_super_admin_sees_every_figure(): void
    {
        $this->seedWork();

        $this->actingAs($this->staff('super-admin'))
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                // Soumise, en cours d'étude, dossier incomplet et présélectionnée : seules deux sont ici.
                ->where('todo.candidatures_to_review', 2)
                ->where('todo.invoices_outstanding.count', 2)
                ->where('todo.invoices_outstanding.amount', 60000)
                ->where('todo.leave_pending', 1)
                ->where('todo.messages_unread', 1));
    }

    public function test_a_cashier_only_sees_the_unpaid_invoices(): void
    {
        $this->seedWork();

        $this->actingAs($this->staff('caissier'))
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('todo.invoices_outstanding.count', 2)
                ->missing('todo.candidatures_to_review')
                ->missing('todo.leave_pending')
                ->missing('todo.messages_unread'));
    }

    public function test_leave_requests_to_review_are_only_shown_to_those_who_can_review_them(): void
    {
        $this->seedWork();

        // Le responsable de la communication voit les messages mais ne valide pas les congés.
        $this->actingAs($this->staff('responsable-communication'))
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('todo.messages_unread', 1)
                ->missing('todo.leave_pending')
                ->missing('todo.invoices_outstanding'));
    }

    public function test_the_unpaid_invoices_page_and_the_dashboard_agree(): void
    {
        $this->seedWork();
        $admin = $this->staff('super-admin');

        $page = $this->actingAs($admin)->get(route('admin.invoices.overdue'));
        $page->assertInertia(fn (Assert $inertia) => $inertia->where('totalOutstanding', 60000)->has('invoices', 2));

        $this->actingAs($admin)->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $inertia) => $inertia->where('todo.invoices_outstanding.amount', 60000));
    }
}

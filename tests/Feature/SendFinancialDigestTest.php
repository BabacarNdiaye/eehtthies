<?php

namespace Tests\Feature;

use App\Mail\FinancialDigest;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SendFinancialDigestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::create(['name' => 'voir_statistiques', 'guard_name' => 'web']);
    }

    private function staffRecipient(): User
    {
        $role = Role::create(['name' => 'direction-test', 'guard_name' => 'web']);
        $role->givePermissionTo('voir_statistiques');

        $user = User::factory()->create();
        $user->assignRole('direction-test');

        return $user;
    }

    public function test_reports_only_last_months_revenue_and_expenses_not_older_activity(): void
    {
        Mail::fake();
        $this->staffRecipient();

        $student = Student::create(['matricule' => 'TEST-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif']);
        $invoice = Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 50000, 'discount' => 0]);

        // Paiement du mois dernier — doit compter
        $invoice->payments()->create(['amount' => 30000, 'method' => 'especes', 'paid_at' => now()->subMonthNoOverflow()]);
        // Paiement d'il y a deux mois — ne doit PAS compter dans le chiffre de ce mois
        $invoice->payments()->create(['amount' => 99999, 'method' => 'especes', 'paid_at' => now()->subMonthNoOverflow()->subMonthNoOverflow()]);

        Expense::create(['label' => 'Fournitures', 'category' => 'autre', 'amount' => 10000, 'expense_date' => now()->subMonthNoOverflow()]);

        Artisan::call('app:send-financial-digest');

        Mail::assertSent(FinancialDigest::class, function ($mail) {
            return $mail->data['revenue'] === 30000.0 && $mail->data['expenses'] === 10000.0 && $mail->data['net'] === 20000.0;
        });
    }

    public function test_skips_sending_when_there_are_no_staff_recipients(): void
    {
        Mail::fake();
        // aucun appel à staffRecipient() — personne n'a voir_statistiques

        Artisan::call('app:send-financial-digest');

        Mail::assertNothingSent();
    }

    public function test_students_and_parents_never_receive_the_financial_digest_even_if_granted_the_permission(): void
    {
        Mail::fake();

        $role = Role::create(['name' => 'eleve', 'guard_name' => 'web']);
        $role->givePermissionTo('voir_statistiques');
        $student = User::factory()->create();
        $student->assignRole('eleve');

        $this->staffRecipient();

        Artisan::call('app:send-financial-digest');

        Mail::assertSent(FinancialDigest::class, 1); // uniquement le vrai membre du personnel, pas l'élève
    }
}

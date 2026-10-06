<?php

namespace Tests\Feature;

use App\Mail\PaymentReceived;
use App\Models\AcademicYear;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\PushAlert;
use App\Services\PaymentNotifier;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

/**
 * Écran « Encaisser » du guichet : une famille règle plusieurs mensualités d'un coup, la somme est répartie sur les
 * plus anciennes d'abord, un seul reçu est émis et la famille en est avertie.
 */
class CashierTest extends TestCase
{
    use RefreshDatabase;

    private User $cashier;

    private User $parent;

    private Student $student;

    private AcademicYear $year;

    private Invoice $sept;

    private Invoice $oct;

    private Invoice $nov;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->cashier = User::factory()->create();
        $this->cashier->assignRole('caissier');
        $this->parent = User::factory()->create(['email' => 'parent@example.test']);
        $this->parent->assignRole('parent');
        $this->student = Student::create([
            'matricule' => 'E-100', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
            'academic_year_id' => $this->year->id, 'parent_user_id' => $this->parent->id,
        ]);

        $this->sept = $this->invoice('Mensualité — Septembre', 9, '2026-09-05');
        $this->oct = $this->invoice('Mensualité — Octobre', 10, '2026-10-05');
        $this->nov = $this->invoice('Mensualité — Novembre', 11, '2026-11-05');
    }

    private function invoice(string $label, int $month, string $due, float $amount = 25000): Invoice
    {
        return Invoice::create([
            'student_id' => $this->student->id, 'academic_year_id' => $this->year->id, 'type' => 'mensualite',
            'period_month' => $month, 'label' => $label, 'amount' => $amount, 'due_date' => $due,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return $overrides + [
            'student_id' => $this->student->id,
            'allocations' => [
                ['invoice_id' => $this->sept->id, 'amount' => 25000],
                ['invoice_id' => $this->oct->id, 'amount' => 25000],
                ['invoice_id' => $this->nov->id, 'amount' => 10000],
            ],
            'channel' => 'wave',
            'reference' => 'WV-12345',
            'paid_at' => '2026-10-06',
            'send_receipt' => true,
        ];
    }

    public function test_the_cash_desk_is_reserved_to_people_who_can_add_payments(): void
    {
        $this->get(route('admin.cashier.create'))->assertRedirect(route('login'));

        $stocks = User::factory()->create();
        $stocks->assignRole('responsable-stocks');
        $this->actingAs($stocks)->get(route('admin.cashier.create'))->assertForbidden();
        $this->actingAs($stocks)->getJson(route('admin.cashier.students', ['q' => 'diop']))->assertForbidden();
        $this->actingAs($stocks)->post(route('admin.cashier.store'), $this->payload())->assertForbidden();

        $this->actingAs($this->cashier)->get(route('admin.cashier.create'))->assertOk();
        $this->assertSame(0, Payment::count());
    }

    public function test_the_search_finds_a_student_by_name_or_matricule_and_reports_the_balance(): void
    {
        $this->actingAs($this->cashier);

        $this->getJson(route('admin.cashier.students', ['q' => 'diop awa']))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->student->id)
            ->assertJsonPath('0.name', 'Awa Diop')
            ->assertJsonPath('0.matricule', 'E-100')
            ->assertJsonPath('0.balance', fn ($balance) => (float) $balance === 75000.0);

        $this->getJson(route('admin.cashier.students', ['q' => 'E-10']))->assertJsonCount(1);
        $this->getJson(route('admin.cashier.students', ['q' => 'zzzz']))->assertOk()->assertJsonCount(0);
        $this->getJson(route('admin.cashier.students', ['q' => 'd']))->assertOk()->assertJsonCount(0);
    }

    public function test_the_selected_student_lists_open_invoices_oldest_first_with_their_lateness(): void
    {
        $this->sept->payments()->create(['amount' => 25000, 'method' => 'especes', 'paid_at' => '2026-09-06']);
        $this->oct->payments()->create(['amount' => 5000, 'method' => 'especes', 'paid_at' => '2026-10-02']);

        $this->actingAs($this->cashier)
            ->get(route('admin.cashier.create', ['student' => $this->student->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Cashier/Index')
                ->where('selected.student.id', $this->student->id)
                ->where('selected.total_due', fn ($total) => (float) $total === 45000.0)
                ->has('selected.invoices', 2)
                ->where('selected.invoices.0.id', $this->oct->id)
                ->where('selected.invoices.0.balance', fn ($balance) => (float) $balance === 20000.0)
                ->where('selected.invoices.0.status', 'en_retard')
                ->where('selected.invoices.0.late_days', 1)
                ->where('selected.invoices.1.id', $this->nov->id)
                ->where('selected.invoices.1.status', 'a_venir')
                ->where('selected.invoices.1.late_days', null)
                ->where('selected.contacts.mail', true)
                ->has('channels.wave'));
    }

    public function test_a_payment_is_spread_over_several_invoices_in_one_encaissement(): void
    {
        $response = $this->actingAs($this->cashier)->post(route('admin.cashier.store'), $this->payload());

        $response->assertSessionHasNoErrors();
        $this->assertSame(3, Payment::count());
        $token = Payment::first()->batch_token;
        $this->assertCount(1, Payment::pluck('batch_token')->unique());
        $this->assertSame([$this->cashier->id], Payment::pluck('received_by')->unique()->values()->all());
        $this->assertSame(['mobile_money'], Payment::pluck('method')->unique()->values()->all());
        $this->assertSame(['wave'], Payment::pluck('channel')->unique()->values()->all());
        $this->assertEquals(0.0, $this->sept->fresh()->balance);
        $this->assertEquals(0.0, $this->oct->fresh()->balance);
        $this->assertEquals(15000.0, $this->nov->fresh()->balance);

        $response->assertRedirect(route('admin.cashier.create', ['student' => $this->student->id, 'done' => $token]));

        $this->get(route('admin.cashier.create', ['student' => $this->student->id, 'done' => $token]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('done.receipt_number', Payment::orderBy('id')->first()->receipt_number)
                ->where('done.total', fn ($total) => (float) $total === 60000.0)
                ->where('done.channel', 'Wave')
                ->has('done.payments', 3)
                ->where('done.contacts.mail', true)
                ->has('done.receipt_url'));
    }

    public function test_an_overpayment_is_refused_and_nothing_is_recorded(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('admin.cashier.store'), $this->payload(['allocations' => [['invoice_id' => $this->sept->id, 'amount' => 26000]]]))
            ->assertSessionHasErrors('allocations');

        $this->assertSame(0, Payment::count());
    }

    public function test_the_form_is_validated(): void
    {
        $this->actingAs($this->cashier);

        $this->post(route('admin.cashier.store'), $this->payload(['allocations' => [['invoice_id' => $this->sept->id, 'amount' => 0]]]))
            ->assertSessionHasErrors('allocations');
        $this->post(route('admin.cashier.store'), $this->payload(['channel' => 'bitcoin']))->assertSessionHasErrors('channel');
        $this->post(route('admin.cashier.store'), $this->payload(['paid_at' => '2026-10-07']))->assertSessionHasErrors('paid_at');
        $this->post(route('admin.cashier.store'), $this->payload(['student_id' => 999999]))->assertSessionHasErrors('student_id');

        $this->assertSame(0, Payment::count());
    }

    public function test_an_invoice_of_another_student_is_refused(): void
    {
        $stranger = Student::create(['matricule' => 'E-200', 'first_name' => 'Fatou', 'last_name' => 'Sow', 'status' => 'actif']);
        $theirs = Invoice::create(['student_id' => $stranger->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000]);

        $this->actingAs($this->cashier)
            ->post(route('admin.cashier.store'), $this->payload(['allocations' => [['invoice_id' => $theirs->id, 'amount' => 1000]]]))
            ->assertSessionHasErrors('allocations');

        $this->assertSame(0, Payment::count());
    }

    public function test_the_receipt_goes_to_the_family_unless_unticked(): void
    {
        Mail::fake();
        Notification::fake();

        $this->actingAs($this->cashier)->post(route('admin.cashier.store'), $this->payload())->assertSessionHasNoErrors();

        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('parent@example.test'));
        Notification::assertSentTo($this->parent, PushAlert::class);
        $assistant = Conversation::where('type', Conversation::TYPE_ASSISTANT)->forUser($this->parent->id)->first();
        $this->assertNotNull($assistant);
        $this->assertCount(1, $assistant->messages()->where('kind', ConversationMessage::KIND_SYSTEM)->get());

        Mail::fake();
        Notification::fake();
        $this->oct->payments()->delete();

        $this->post(route('admin.cashier.store'), $this->payload([
            'allocations' => [['invoice_id' => $this->oct->id, 'amount' => 5000]],
            'send_receipt' => false,
        ]))->assertSessionHasNoErrors();

        Mail::assertNothingSent();
        Notification::assertNothingSent();
    }

    public function test_a_notification_failure_never_breaks_the_payment(): void
    {
        $this->mock(PaymentNotifier::class, function (MockInterface $mock) {
            $mock->shouldReceive('receipt')->andThrow(new RuntimeException('Serveur de courrier injoignable'));
        });

        $this->actingAs($this->cashier)
            ->post(route('admin.cashier.store'), $this->payload())
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertSame(3, Payment::count());
    }

    public function test_the_receipt_can_be_sent_again(): void
    {
        Mail::fake();
        Notification::fake();
        $this->actingAs($this->cashier)->post(route('admin.cashier.store'), $this->payload(['send_receipt' => false]));
        $token = Payment::first()->batch_token;

        $this->post(route('admin.cashier.resend'), ['batch_token' => $token])->assertSessionHasNoErrors();

        Mail::assertSent(PaymentReceived::class, fn (PaymentReceived $mail) => $mail->hasTo('parent@example.test'));

        $this->post(route('admin.cashier.resend'), ['batch_token' => 'inconnu'])->assertSessionHasErrors('batch_token');
    }

    public function test_a_payment_can_target_one_invoice_from_the_monthly_tracker(): void
    {
        $this->actingAs($this->cashier)
            ->get(route('admin.cashier.create', ['student' => $this->student->id, 'invoice' => $this->nov->id]))
            ->assertInertia(fn (Assert $page) => $page->where('focus_invoice', $this->nov->id));
    }
}

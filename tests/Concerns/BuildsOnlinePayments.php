<?php

namespace Tests\Concerns;

use App\Models\Invoice;
use App\Models\PaymentAttempt;
use App\Models\Student;
use App\Models\User;
use App\Services\OnlinePayments;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;
use Tests\Support\FakeGateway;

/**
 * Décor commun aux tests du paiement en ligne : un élève avec son compte et celui de son parent, deux mensualités
 * ouvertes de 25 000 FCFA et un faux fournisseur de paiement actif (clé secrète « test-secret »).
 */
trait BuildsOnlinePayments
{
    protected User $pupilUser;

    protected User $parentUser;

    protected Student $student;

    protected Invoice $oct;

    protected Invoice $nov;

    protected function setUpOnlinePayments(string $driver = 'fake'): void
    {
        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));

        config([
            'payments.driver' => $driver,
            'payments.allow_simulation' => false,
            'payments.attempt_ttl' => 60,
            'payments.drivers.fake' => ['class' => FakeGateway::class, 'secret' => 'test-secret'],
        ]);
        FakeGateway::reset();

        $this->pupilUser = User::factory()->create(['email' => 'eleve@example.test']);
        $this->pupilUser->assignRole('eleve');
        $this->parentUser = User::factory()->create(['email' => 'parent@example.test']);
        $this->parentUser->assignRole('parent');

        $this->student = $this->makeStudent('Awa', ['user_id' => $this->pupilUser->id, 'parent_user_id' => $this->parentUser->id]);
        $this->oct = $this->invoiceFor($this->student, 'Mensualité — Octobre', 25000, '2026-10-05');
        $this->nov = $this->invoiceFor($this->student, 'Mensualité — Novembre', 25000, '2026-11-05');
    }

    protected function makeStudent(string $first, array $attributes = []): Student
    {
        return Student::create($attributes + [
            'matricule' => 'T-'.uniqid(), 'first_name' => $first, 'last_name' => 'Diop', 'status' => 'actif',
        ]);
    }

    protected function invoiceFor(Student $student, string $label, float $amount, string $due): Invoice
    {
        return Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => $label, 'amount' => $amount, 'discount' => 0, 'due_date' => $due,
        ]);
    }

    /** Une tentative démarrée par le service, comme le ferait le portail : octobre + novembre = 50 000 FCFA par défaut. */
    protected function startedAttempt(?array $invoiceIds = null, ?float $amount = null, string $channel = 'wave'): PaymentAttempt
    {
        $invoiceIds ??= [$this->oct->id, $this->nov->id];
        $amount ??= 50000;

        return app(OnlinePayments::class)->start($this->student, $invoiceIds, $amount, $channel, $this->parentUser);
    }

    /** Notification du fournisseur, signée comme le fait le faux fournisseur (HMAC-SHA256 du corps avec « test-secret »). */
    protected function webhook(array $payload, ?string $signature = null, string $driver = 'fake')
    {
        $body = json_encode($payload);
        $signature ??= hash_hmac('sha256', $body, 'test-secret');

        return $this->call('POST', route('payments.webhook', $driver), [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => $signature], $body);
    }

    protected function success(PaymentAttempt $attempt, ?float $amount = null, string $providerReference = 'FK-OK'): array
    {
        return [
            'reference' => $attempt->reference, 'status' => 'succeeded', 'amount' => $amount ?? (float) $attempt->amount,
            'provider_reference' => $providerReference, 'channel' => $attempt->channel,
        ];
    }

    /** Membre du personnel d'un rôle neutre à qui l'on donne seulement les permissions voulues (un utilisateur sans rôle recevrait un 403 du middleware du personnel). */
    protected function staffActor(string ...$permissions): User
    {
        Role::findOrCreate('auxiliaire-test', 'web');

        $user = User::factory()->create();
        $user->assignRole('auxiliaire-test');
        $user->givePermissionTo($permissions);

        return $user;
    }
}

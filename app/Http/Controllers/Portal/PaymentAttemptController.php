<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Site\PaymentWebhookController;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\Student;
use App\Payments\GatewayEvent;
use App\Payments\PaymentGateways;
use App\Payments\SimulationGateway;
use App\Services\OnlinePayments;
use App\Support\PaymentChannels;
use App\Support\PaymentException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Paiement en ligne côté famille : démarrer (élève ou parent, pour ses propres factures), suivre la tentative après le
 * retour du fournisseur, et — avec le pilote de simulation seulement — jouer le rôle du fournisseur. Rien ici ne peut
 * encaisser : seule une notification signée du fournisseur le fait (voir OnlinePayments).
 */
class PaymentAttemptController extends Controller
{
    public function startForStudent(Request $request, OnlinePayments $online): SymfonyResponse
    {
        $student = $request->user()->student;
        abort_unless($student, 404, "Aucun profil élève n'est associé à ce compte.");

        return $this->start($request, $online, $student);
    }

    public function startForChild(Request $request, Student $student, OnlinePayments $online): SymfonyResponse
    {
        abort_unless($student->parent_user_id === $request->user()->id, 403);

        return $this->start($request, $online, $student);
    }

    /** Où l'on revient après le paiement : l'état de la tentative, puis le reçu. */
    public function show(Request $request, PaymentAttempt $attempt): Response
    {
        $context = $this->context($request, $attempt);
        $student = $attempt->student;
        $first = $attempt->batch_token ? Payment::where('batch_token', $attempt->batch_token)->orderBy('id')->first() : null;

        return Inertia::render('Portal/Payments/Status', [
            'attempt' => $this->summary($attempt) + [
                'note' => $context === 'staff' ? $attempt->note : null,
                'resume_url' => $attempt->canResume() ? $attempt->checkout_url : null,
                'receipt_number' => $first?->receipt_number,
                'receipt_url' => $first ? $this->receiptUrl($context, $student, $first) : null,
                'back_url' => match ($context) {
                    'parent' => route('parent.child', ['student' => $student, 'tab' => 'factures'], false),
                    'student' => route('student.invoices', [], false),
                    default => route('admin.online-payments.index', [], false),
                },
                'status_url' => route('payments.show', $attempt, false),
            ],
        ]);
    }

    /** La page du faux fournisseur : le payeur y choisit un résultat. */
    public function simulation(Request $request, PaymentAttempt $attempt, PaymentGateways $gateways): Response
    {
        $this->context($request, $attempt);
        abort_unless($gateways->find('simulation'), 404);

        return Inertia::render('Portal/Payments/Simulation', [
            'attempt' => $this->summary($attempt) + ['open' => $attempt->isOpen()],
            'complete_url' => route('payments.simulation.complete', $attempt, false),
            'status_url' => route('payments.show', $attempt, false),
        ]);
    }

    /**
     * Le résultat choisi sur la page de simulation est « notifié » à l'application par le chemin d'un vrai fournisseur :
     * corps signé, authentifié par la simulation, appliqué une seule fois par OnlinePayments.
     */
    public function completeSimulation(Request $request, PaymentAttempt $attempt, PaymentGateways $gateways, OnlinePayments $online): RedirectResponse
    {
        $this->context($request, $attempt);
        $gateway = $gateways->find('simulation');
        abort_unless($gateway instanceof SimulationGateway, 404);

        $data = $request->validate(['outcome' => ['required', Rule::in(['success', 'failure'])]]);
        $notification = $gateway->notification($attempt, $data['outcome'] === 'success' ? GatewayEvent::SUCCEEDED : GatewayEvent::FAILED);

        $webhook = Request::create(route('payments.webhook', 'simulation', false), 'POST', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $notification['signature'],
        ], $notification['body']);

        app(PaymentWebhookController::class)($webhook, 'simulation', $gateways, $online);

        return redirect()->route('payments.show', $attempt);
    }

    private function start(Request $request, OnlinePayments $online, Student $student): SymfonyResponse
    {
        abort_unless($online->enabled(), 404);

        $data = $request->validate([
            'invoice_ids' => ['required', 'array', 'min:1'],
            'invoice_ids.*' => ['integer', 'distinct'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'channel' => ['required', 'string', 'max:40'],
        ]);

        try {
            $attempt = $online->start($student, $data['invoice_ids'], (float) $data['amount'], $data['channel'], $request->user());
        } catch (PaymentException $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }

        // Vers le fournisseur : une redirection que le navigateur suit hors de l'application (Inertia l'exige ainsi).
        return Inertia::location($attempt->checkout_url);
    }

    /**
     * Qui regarde cette tentative : l'élève, son parent, ou le personnel de la comptabilité. Tout autre compte est refusé.
     *
     * @return 'student'|'parent'|'staff'
     */
    private function context(Request $request, PaymentAttempt $attempt): string
    {
        $user = $request->user();
        $student = $attempt->student;

        if ($student->user_id === $user->id) {
            return 'student';
        }

        if ($student->parent_user_id === $user->id) {
            return 'parent';
        }

        // Les rôles élève et parent portent des permissions dans les données de départ : « voir la comptabilité » ne suffit
        // donc pas, il faut aussi faire partie du personnel.
        abort_unless(EnsureUserIsStaff::isStaff($user) && $user->can('voir_comptabilite'), 403);

        return 'staff';
    }

    /** @return array<string, mixed> */
    private function summary(PaymentAttempt $attempt): array
    {
        $labels = Invoice::whereIn('id', array_keys($attempt->allocations))->pluck('label', 'id');

        return [
            'reference' => $attempt->reference,
            'status' => $attempt->status,
            'status_label' => $attempt->status_label,
            'amount' => (float) $attempt->amount,
            'channel_label' => PaymentChannels::label($attempt->channel),
            'student_name' => $attempt->student->full_name,
            'created_at' => $attempt->created_at->toIso8601String(),
            'invoices' => collect($attempt->allocations)->map(fn ($amount, $invoiceId) => [
                'label' => $labels[(int) $invoiceId] ?? 'Facture',
                'amount' => (float) $amount,
            ])->values()->all(),
        ];
    }

    private function receiptUrl(string $context, Student $student, Payment $payment): string
    {
        return match ($context) {
            'parent' => route('parent.invoices.receipt', [$student, $payment->invoice_id, $payment->id], false),
            'student' => route('student.invoices.receipt', [$payment->invoice_id, $payment->id], false),
            default => route('admin.invoices.payments.receipt', [$payment->invoice_id, $payment->id], false),
        };
    }
}

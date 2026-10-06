<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PayrollLine;
use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use App\Services\PaymentAllocator;
use App\Services\PayrollPreparer;
use App\Services\PayslipNotifier;
use App\Services\SalaryRecorder;
use App\Support\Exportable;
use App\Support\PaymentChannels;
use App\Support\PayoutAccount;
use App\Support\Payslip;
use App\Support\SalaryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paie mensuelle : on prépare le mois (une ligne par personne), on vérifie les heures, primes et retenues, on valide, puis
 * on verse ligne par ligne ou d'un coup. Rien n'est versé avant la validation ; l'ordre de paiement ne crée aucun paiement.
 */
class PayrollController extends Controller
{
    use Exportable;

    /** Issue d'un versement : le salaire vient d'être enregistré, ou il l'était déjà au registre et la ligne y est rattachée. */
    private const PAID = 'paid';

    private const ATTACHED = 'attached';

    public function index(): Response
    {
        $runs = PayrollRun::with('lines:id,payroll_run_id,net_amount,salary_payment_id,teacher_salary_payment_id')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->get()
            ->map(function (PayrollRun $run) {
                $payroll = (float) $run->lines->sum('net_amount');
                $paid = (float) $run->lines->filter(fn (PayrollLine $line) => $line->is_paid)->sum('net_amount');

                return [
                    'id' => $run->id,
                    'period_year' => $run->period_year,
                    'period_month' => $run->period_month,
                    'label' => $run->label,
                    'of_label' => $run->of_label,
                    'status' => $run->status,
                    'lines_count' => $run->lines->count(),
                    'payroll' => round($payroll, 2),
                    'paid' => round($paid, 2),
                    'remaining' => round($payroll - $paid, 2),
                ];
            });

        return Inertia::render('Admin/Payroll/Index', [
            'runs' => $runs,
            'monthLabels' => Invoice::MONTH_LABELS,
            'defaultYear' => (int) now()->format('Y'),
            'defaultMonth' => (int) now()->format('n'),
        ]);
    }

    public function store(Request $request, PayrollPreparer $preparer): RedirectResponse
    {
        $data = $request->validate([
            'period_year' => ['required', 'integer', 'between:2020,2100'],
            'period_month' => ['required', 'integer', 'between:1,12'],
        ]);

        $run = $preparer->prepare((int) $data['period_year'], (int) $data['period_month'], $request->user());

        if ($run->wasRecentlyCreated) {
            activity('salaires')->causedBy($request->user())->performedOn($run)->log("Paie {$run->of_label} préparée");
        }

        return redirect()->route('admin.payroll.show', $run)->with('success', $run->wasRecentlyCreated
            ? "Paie {$run->of_label} préparée : vérifiez les lignes, puis validez."
            : "La paie {$run->of_label} existe déjà.");
    }

    public function show(Request $request, PayrollRun $payrollRun, PayrollPreparer $preparer): Response
    {
        $payrollRun->load('lines.salaryPayment', 'lines.teacherSalaryPayment', 'lines.run', 'validator:id,name');

        $canEdit = $request->user()->can('modifier_salaires') && $payrollRun->isDraft();
        $lines = $payrollRun->lines->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();

        $payroll = (float) $lines->sum('net_amount');
        $paid = (float) $lines->filter(fn (PayrollLine $line) => $line->is_paid)->sum('net_amount');

        return Inertia::render('Admin/Payroll/Show', [
            'run' => [
                'id' => $payrollRun->id,
                'period_year' => $payrollRun->period_year,
                'period_month' => $payrollRun->period_month,
                'label' => $payrollRun->label,
                'of_label' => $payrollRun->of_label,
                'status' => $payrollRun->status,
                'validated_at' => $payrollRun->validated_at?->toIso8601String(),
                'validated_by' => $payrollRun->validator?->name,
            ],
            'lines' => $lines->map(fn (PayrollLine $line) => $this->lineData($line, $canEdit)),
            'totals' => [
                'payroll' => round($payroll, 2),
                'paid' => round($paid, 2),
                'remaining' => round($payroll - $paid, 2),
                'count' => $lines->count(),
                'paid_count' => $lines->filter(fn (PayrollLine $line) => $line->is_paid)->count(),
            ],
            'missing' => $payrollRun->isDraft() ? $preparer->missing($payrollRun) : [],
            'channels' => PaymentChannels::payoutOptions(),
        ]);
    }

    /** Ajoute au brouillon les personnes devenues éligibles depuis la préparation, sans toucher aux lignes existantes. */
    public function refresh(PayrollRun $payrollRun, PayrollPreparer $preparer): RedirectResponse
    {
        if (! $payrollRun->isDraft()) {
            return back()->with('error', 'Ce cycle est validé : rouvrez-le pour y ajouter des personnes.');
        }

        $added = $preparer->refresh($payrollRun);

        return back()->with('success', $added > 0 ? "{$added} ligne(s) ajoutée(s) au cycle." : 'Aucune personne à ajouter : le cycle est à jour.');
    }

    public function updateLine(Request $request, PayrollRun $payrollRun, PayrollLine $payrollLine): RedirectResponse
    {
        abort_unless($payrollLine->payroll_run_id === $payrollRun->id, 404);

        if (! $payrollRun->isDraft()) {
            return back()->with('error', 'Ce cycle est validé : rouvrez-le pour modifier ses lignes.');
        }

        if ($payrollLine->is_paid) {
            return back()->with('error', 'Cette ligne est déjà payée : elle ne peut plus être modifiée.');
        }

        $data = $request->validate([
            'hours' => ['nullable', 'numeric', 'min:0', 'max:744'],
            'adjustments' => ['nullable', 'array', 'max:20'],
            'adjustments.*.type' => ['required', Rule::in([PayrollLine::BONUS, PayrollLine::DEDUCTION])],
            'adjustments.*.label' => ['required', 'string', 'max:120'],
            'adjustments.*.amount' => ['required', 'numeric', 'gt:0', 'max:100000000'],
            'payout_channel' => ['nullable', Rule::in(array_keys(PaymentChannels::payoutOptions()))],
            'payout_account' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $hourly = $payrollLine->payment_type === 'horaire';

        if (! $hourly && $request->filled('hours')) {
            throw ValidationException::withMessages(['hours' => "Les heures ne concernent que les enseignants payés à l'heure."]);
        }

        $base = (float) $payrollLine->base_amount;
        $hours = $payrollLine->hours;

        if ($hourly && $request->filled('hours')) {
            $hours = round((float) $data['hours'], 2);
            $base = round($hours * (float) $payrollLine->hourly_rate, 2);
        }

        if (array_key_exists('adjustments', $data)) {
            $payrollLine->adjustments = collect($data['adjustments'] ?? [])
                ->map(fn (array $adjustment) => [
                    'type' => $adjustment['type'],
                    'label' => trim($adjustment['label']),
                    'amount' => round((float) $adjustment['amount'], 2),
                ])
                ->values()
                ->all();
        }

        $net = $payrollLine->computeNet($base);

        if ($net < 0) {
            throw ValidationException::withMessages(['adjustments' => 'Les retenues dépassent le salaire : le net ne peut pas être négatif.']);
        }

        foreach (['payout_channel', 'payout_account', 'notes'] as $field) {
            if (array_key_exists($field, $data)) {
                $payrollLine->{$field} = $data[$field] === '' ? null : $data[$field];
            }
        }

        $payrollLine->base_amount = $base;
        $payrollLine->hours = $hours;
        $payrollLine->net_amount = $net;
        $payrollLine->save();

        return back()->with('success', "Ligne de {$payrollLine->name} mise à jour.");
    }

    /** Valide le cycle : les lignes sont figées et les versements deviennent possibles. */
    public function approve(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if (! $payrollRun->isDraft()) {
            return back()->with('error', 'Ce cycle est déjà validé.');
        }

        if ($payrollRun->lines()->doesntExist()) {
            return back()->with('error', "Ce cycle ne contient aucune ligne : il n'y a rien à valider.");
        }

        $payrollRun->update([
            'status' => PayrollRun::VALIDATED,
            'validated_by' => $request->user()->id,
            'validated_at' => now(),
        ]);

        activity('salaires')->causedBy($request->user())->performedOn($payrollRun)->log("Paie {$payrollRun->of_label} validée");

        return back()->with('success', "Paie {$payrollRun->of_label} validée : les salaires peuvent être versés.");
    }

    public function reopen(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if (! $payrollRun->isValidated()) {
            return back()->with('error', "Ce cycle n'est pas validé.");
        }

        if ($payrollRun->lines()->where(fn ($query) => $query->whereNotNull('salary_payment_id')->orWhereNotNull('teacher_salary_payment_id'))->exists()) {
            return back()->with('error', 'Au moins une ligne est déjà payée : le cycle ne peut plus être rouvert.');
        }

        $payrollRun->update(['status' => PayrollRun::DRAFT, 'validated_by' => null, 'validated_at' => null]);

        activity('salaires')->causedBy($request->user())->performedOn($payrollRun)->log("Paie {$payrollRun->of_label} rouverte");

        return back()->with('success', "Paie {$payrollRun->of_label} rouverte : les lignes sont de nouveau modifiables.");
    }

    public function destroy(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if (! $payrollRun->isDraft()) {
            return back()->with('error', "Un cycle validé ne peut pas être supprimé : rouvrez-le d'abord (impossible si un salaire est déjà versé).");
        }

        $label = $payrollRun->of_label;
        $payrollRun->delete();

        activity('salaires')->causedBy($request->user())->log("Brouillon de paie {$label} supprimé");

        return redirect()->route('admin.payroll.index')->with('success', "Brouillon de paie {$label} supprimé.");
    }

    public function payLine(Request $request, PayrollRun $payrollRun, PayrollLine $payrollLine, SalaryRecorder $recorder, PayslipNotifier $notifier): RedirectResponse
    {
        abort_unless($payrollLine->payroll_run_id === $payrollRun->id, 404);

        if (! $payrollRun->isValidated()) {
            return back()->with('error', 'Le cycle doit être validé avant de verser les salaires.');
        }

        $data = $request->validate([
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'channel' => ['nullable', Rule::in(array_keys(PaymentChannels::payoutOptions()))],
        ]);

        $channel = $data['channel'] ?? $payrollLine->payout_channel;

        if (! $channel) {
            throw ValidationException::withMessages(['channel' => 'Choisissez un mode de versement.']);
        }

        try {
            $outcome = $this->settle($payrollRun, $payrollLine, $channel, $data['paid_at'], $request->user(), $recorder, $notifier);
        } catch (SalaryException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', $outcome === self::ATTACHED
            ? "Le salaire de {$payrollLine->name} était déjà enregistré au registre des salaires : la ligne y est rattachée et son bulletin est disponible."
            : "Salaire de {$payrollLine->name} versé.");
    }

    public function payAll(Request $request, PayrollRun $payrollRun, SalaryRecorder $recorder, PayslipNotifier $notifier): RedirectResponse
    {
        if (! $payrollRun->isValidated()) {
            return back()->with('error', 'Le cycle doit être validé avant de verser les salaires.');
        }

        $data = $request->validate([
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'channel' => ['nullable', Rule::in(array_keys(PaymentChannels::payoutOptions()))],
        ]);

        $lines = $payrollRun->lines()->get()->filter(fn (PayrollLine $line) => ! $line->is_paid && (float) $line->net_amount > 0);

        if ($lines->isEmpty()) {
            return back()->with('error', 'Aucune ligne à payer : tout est déjà versé.');
        }

        $paid = 0;
        $attached = 0;
        $skipped = [];

        foreach ($lines as $line) {
            // Le mode propre à la personne prime ; à défaut, celui choisi pour tout le monde.
            $channel = $line->payout_channel ?: ($data['channel'] ?? null);

            if (! $channel) {
                $skipped[] = $line->name;

                continue;
            }

            try {
                if ($this->settle($payrollRun, $line, $channel, $data['paid_at'], $request->user(), $recorder, $notifier) === self::ATTACHED) {
                    $attached++;
                } else {
                    $paid++;
                }
            } catch (SalaryException) {
                $skipped[] = $line->name;
            }
        }

        $note = ($attached > 0 ? " {$attached} déjà enregistré(s) au registre des salaires : rattaché(s) à la paie." : '')
            .($skipped !== [] ? ' Non versés (mode de versement manquant, somme différente de celle du registre ou déjà payé) : '.implode(', ', $skipped).'.' : '');

        return $paid + $attached > 0
            ? back()->with('success', "{$paid} salaire(s) versé(s).".$note)
            : back()->with('error', 'Aucun salaire versé.'.$note);
    }

    public function payoutCsv(Request $request, PayrollRun $payrollRun)
    {
        return $this->payout($request, $payrollRun, 'csv');
    }

    public function payoutPdf(Request $request, PayrollRun $payrollRun)
    {
        return $this->payout($request, $payrollRun, 'pdf');
    }

    /** Bulletin d'une ligne payée (le même document que reçoit l'intéressé dans « Ma paie »). */
    public function payslip(PayrollRun $payrollRun, PayrollLine $payrollLine)
    {
        abort_unless($payrollLine->payroll_run_id === $payrollRun->id, 404);

        if (! $payrollLine->is_paid) {
            return back()->with('error', "Le bulletin n'existe qu'une fois le salaire versé.");
        }

        return Payslip::pdf($payrollLine)->stream(Payslip::filename($payrollLine));
    }

    /**
     * Verse une ligne : le salaire (dépense, écriture comptable, paiement de la personne) puis le lien avec la ligne, le
     * tout d'un bloc, sous verrou. Si le registre contient déjà le versement de ce mois pour la même somme, la ligne y est
     * simplement rattachée ; pour une autre somme, rien n'est fait : la ligne et le registre se contrediraient.
     *
     * @return self::PAID|self::ATTACHED
     *
     * @throws SalaryException
     */
    private function settle(PayrollRun $run, PayrollLine $line, string $channel, string $paidAt, User $by, SalaryRecorder $recorder, PayslipNotifier $notifier): string
    {
        [$outcome, $settled] = DB::transaction(function () use ($run, $line, $channel, $paidAt, $by, $recorder) {
            $locked = PayrollLine::whereKey($line->id)->lockForUpdate()->firstOrFail();

            if ($locked->is_paid) {
                throw new SalaryException('Cette ligne est déjà payée.');
            }

            if ((float) $locked->net_amount <= 0) {
                throw new SalaryException("Le net est nul : il n'y a rien à verser.");
            }

            $payee = $locked->user_id ? User::find($locked->user_id) : ($locked->teacher_id ? Teacher::find($locked->teacher_id) : null);

            if (! $payee) {
                throw new SalaryException("La fiche de {$locked->name} n'existe plus : le salaire ne peut pas être versé ici.");
            }

            try {
                $payment = $recorder->record(
                    $payee,
                    $run->period_year,
                    $run->period_month,
                    (float) $locked->net_amount,
                    $paidAt,
                    PaymentChannels::methodFor($channel),
                    $locked->hours !== null ? (float) $locked->hours : null,
                    "Paie {$run->label} — {$locked->reference}",
                    $by->id,
                );
            } catch (SalaryException $already) {
                // Déjà versé par le registre des salaires : on rattache la ligne à ce paiement au lieu de la laisser bloquée.
                $existing = $payee instanceof Teacher
                    ? TeacherSalaryPayment::where('teacher_id', $payee->id)->where('period_year', $run->period_year)->where('period_month', $run->period_month)->first()
                    : SalaryPayment::where('user_id', $payee->id)->where('period_year', $run->period_year)->where('period_month', $run->period_month)->first();

                if (! $existing) {
                    throw $already;
                }

                if (PaymentAllocator::cents($existing->amount) !== PaymentAllocator::cents($locked->net_amount)) {
                    throw new SalaryException(sprintf(
                        'Un salaire de %s FCFA est déjà enregistré pour %s dans le registre des salaires, alors que la paie prévoit %s FCFA. Annulez-le dans le registre, puis versez-le depuis la paie.',
                        number_format((float) $existing->amount, 0, ',', ' '),
                        $run->of_label,
                        number_format((float) $locked->net_amount, 0, ',', ' '),
                    ));
                }

                $locked->forceFill([$existing instanceof SalaryPayment ? 'salary_payment_id' : 'teacher_salary_payment_id' => $existing->id])->save();

                return [self::ATTACHED, $locked];
            }

            $locked->forceFill([
                $payment instanceof SalaryPayment ? 'salary_payment_id' : 'teacher_salary_payment_id' => $payment->id,
                'payout_channel' => $channel,
            ])->save();

            return [self::PAID, $locked];
        });

        activity('salaires')->causedBy($by)->performedOn($run)->log($outcome === self::ATTACHED
            ? "Salaire de {$settled->name} rattaché à la paie, déjà enregistré au registre ({$run->label})"
            : "Salaire de {$settled->name} versé ({$run->label})");

        // La personne est prévenue après la réponse (son bulletin est disponible) : un canal en panne ne bloque jamais le paiement.
        defer(fn () => rescue(fn () => $notifier->paid($settled)));

        return $outcome;
    }

    private function payout(Request $request, PayrollRun $run, string $format)
    {
        if (! $run->isValidated()) {
            return back()->with('error', "Validez le cycle avant de produire l'ordre de paiement.");
        }

        $lines = $run->lines()
            ->with('run')
            ->whereNull('salary_payment_id')
            ->whereNull('teacher_salary_payment_id')
            ->where('net_amount', '>', 0)
            ->orderBy('name')
            ->get();

        if ($lines->isEmpty()) {
            return back()->with('error', 'Aucun versement en attente : tout est déjà payé.');
        }

        activity('salaires')->causedBy($request->user())->performedOn($run)->log("Ordre de paiement exporté ({$format}) pour {$run->label}");

        $columns = [
            ['key' => 'reference', 'label' => 'Référence'],
            ['key' => 'name', 'label' => 'Bénéficiaire'],
            ['key' => 'position', 'label' => 'Fonction'],
            ['key' => 'channel', 'label' => 'Mode'],
            ['key' => 'account', 'label' => 'Compte'],
            ['key' => 'net', 'label' => $format === 'csv' ? 'Montant net (FCFA)' : 'Montant net', 'align' => 'right'],
        ];

        // Le fichier s'ouvre dans un tableur : un nom ou un compte saisi à la main ne doit pas pouvoir s'y exécuter comme une formule.
        $cell = fn (?string $value) => $format === 'csv' ? $this->csvCell($value) : $value;

        $rows = $lines->map(fn (PayrollLine $line) => [
            'reference' => $line->reference,
            'name' => $cell($line->name),
            'position' => $cell($line->position),
            'channel' => $line->payout_channel ? PaymentChannels::label($line->payout_channel) : '',
            'account' => $cell($line->payout_account),
            'net' => $format === 'csv'
                ? rtrim(rtrim(number_format((float) $line->net_amount, 2, '.', ''), '0'), '.')
                : number_format((float) $line->net_amount, 0, ',', ' ').' FCFA',
        ]);

        $filename = sprintf('ordre-de-paiement-%d-%02d.%s', $run->period_year, $run->period_month, $format);

        if ($format === 'csv') {
            return $this->csvResponse($filename, $columns, $rows);
        }

        return $this->pdfResponse(
            $filename,
            "Ordre de paiement — {$run->label}",
            $columns,
            $rows,
            'Document confidentiel : il contient des numéros de compte.',
            ['Total à verser' => number_format((float) $lines->sum('net_amount'), 0, ',', ' ').' FCFA', 'Émis le' => Carbon::now()->format('d/m/Y')],
        );
    }

    /**
     * Un tableur exécute une cellule qui commence par « = » ou « @ », ou par un « + » / « - » qui n'est pas un simple nombre ou
     * numéro de téléphone : on la précède d'une apostrophe. « +221 77 123 45 67 » reste lisible tel quel.
     */
    private function csvCell(?string $value): ?string
    {
        if ($value !== null && preg_match('/^[=@\t\r]|^[+\-](?![\d\s.()\-]*$)/u', $value)) {
            return "'".$value;
        }

        return $value;
    }

    /** @return array<string, mixed> */
    private function lineData(PayrollLine $line, bool $canEdit): array
    {
        $payment = $line->payment();

        return [
            'id' => $line->id,
            'person_type' => $line->user_id ? 'staff' : 'teacher',
            'name' => $line->name,
            'position' => $line->position,
            'payment_type' => $line->payment_type,
            'base_amount' => (float) $line->base_amount,
            'hours' => $line->hours !== null ? (float) $line->hours : null,
            'hourly_rate' => $line->hourly_rate !== null ? (float) $line->hourly_rate : null,
            'adjustments' => $line->adjustments ?? [],
            'net_amount' => (float) $line->net_amount,
            'payout_channel' => $line->payout_channel,
            'payout_channel_label' => $line->payout_channel ? PaymentChannels::label($line->payout_channel) : null,
            'payout_account_masked' => PayoutAccount::mask($line->payout_account),
            // Le numéro complet ne sort que pour celui qui peut le corriger, tant que le cycle est un brouillon.
            'payout_account' => $canEdit ? $line->payout_account : null,
            'unmatched_sessions' => $line->unmatched_sessions,
            'notes' => $line->notes,
            'is_paid' => $line->is_paid,
            'paid_at' => $payment?->paid_at?->toDateString(),
            'reference' => $line->reference,
        ];
    }
}

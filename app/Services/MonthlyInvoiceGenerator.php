<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;

/**
 * Génère les mensualités d'une formation (une facture par élève actif et par mois, sans doublon) en leur donnant une
 * échéance : sans date, une mensualité n'est jamais « en retard » et échappe aux relances.
 */
class MonthlyInvoiceGenerator
{
    public const DEFAULT_DUE_DAY = 5;

    /** Jour du mois où une mensualité est due (réglages des paiements), de 1 à 28 pour exister tous les mois. */
    public static function dueDay(): int
    {
        return min(max((int) Setting::get('finance_due_day', self::DEFAULT_DUE_DAY), 1), 28);
    }

    /**
     * @param  list<int>  $months  mois civils (1 à 12)
     * @return int nombre de factures créées
     */
    public function generate(Formation $formation, AcademicYear|int $academicYear, array $months, ?float $amount = null): int
    {
        $year = $academicYear instanceof AcademicYear ? $academicYear : AcademicYear::findOrFail($academicYear);
        $amount ??= round(((float) $formation->tuition_fee) / max(count($months), 1), 2);
        $dueDay = self::dueDay();
        $created = 0;

        foreach (Student::where('formation_id', $formation->id)->where('status', 'actif')->get() as $student) {
            foreach ($months as $month) {
                $exists = Invoice::where('student_id', $student->id)
                    ->where('academic_year_id', $year->id)
                    ->where('type', 'mensualite')
                    ->where('period_month', $month)
                    ->exists();

                if ($exists) {
                    continue;
                }

                Invoice::create([
                    'student_id' => $student->id,
                    'academic_year_id' => $year->id,
                    'type' => 'mensualite',
                    'period_month' => $month,
                    'label' => 'Mensualité — '.Invoice::MONTH_LABELS[$month].' — '.$formation->name,
                    'amount' => $amount,
                    'due_date' => Invoice::dueDateFor($year, (int) $month, $dueDay),
                ]);
                $created++;
            }
        }

        return $created;
    }

    /** Mensualités sans échéance dont la date peut se calculer (mois et année académique connus). */
    public function missingDueDates(): Builder
    {
        return Invoice::query()
            ->where('type', 'mensualite')
            ->whereNull('due_date')
            ->whereNotNull('period_month')
            ->whereNotNull('academic_year_id');
    }

    /**
     * Pose l'échéance manquante des mensualités existantes. Les dates déjà saisies ne sont jamais touchées. Mise à jour
     * « silencieuse » (une ligne de journal d'activité est écrite par l'appelant, pas une par facture).
     *
     * @return int nombre d'échéances fixées
     */
    public function fixMissingDueDates(): int
    {
        $dueDay = self::dueDay();
        $years = AcademicYear::all()->keyBy('id');
        $fixed = 0;

        $this->missingDueDates()->chunkById(200, function ($invoices) use ($years, $dueDay, &$fixed) {
            foreach ($invoices as $invoice) {
                $year = $years->get($invoice->academic_year_id);

                if (! $year) {
                    continue;
                }

                $invoice->due_date = Invoice::dueDateFor($year, (int) $invoice->period_month, $dueDay);
                $invoice->saveQuietly();
                $fixed++;
            }
        });

        return $fixed;
    }
}

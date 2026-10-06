<?php

namespace App\Console\Commands;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Setting;
use App\Services\MonthlyInvoiceGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GenerateMonthlyInvoices extends Command
{
    protected $signature = 'app:generate-monthly-invoices';

    protected $description = "Génère le 1er du mois la mensualité du mois en cours de chaque élève actif (un dixième des frais de scolarité de sa formation). Ne fait rien tant que la génération automatique n'est pas activée dans les réglages des paiements.";

    public function handle(MonthlyInvoiceGenerator $generator): int
    {
        if (! Setting::flag('finance_auto_generate_monthly')) {
            $this->info('Génération automatique désactivée dans les réglages des paiements : rien à faire.');

            return self::SUCCESS;
        }

        $month = Carbon::today()->month;

        if (! in_array($month, Invoice::SCHOOL_MONTHS, true)) {
            $this->info('Ce mois est hors du calendrier scolaire : aucune mensualité à générer.');

            return self::SUCCESS;
        }

        $year = AcademicYear::where('is_current', true)->orderByDesc('start_date')->first();

        if (! $year) {
            $this->warn("Aucune année académique en cours : aucune mensualité n'est générée.");

            return self::SUCCESS;
        }

        $created = 0;

        foreach (Formation::where('tuition_fee', '>', 0)->get() as $formation) {
            // Les frais de scolarité se règlent en dix mensualités (septembre à juin), comme à la génération manuelle.
            $amount = round((float) $formation->tuition_fee / count(Invoice::SCHOOL_MONTHS), 2);
            $created += $generator->generate($formation, $year, [$month], $amount);
        }

        if ($created > 0) {
            activity('comptabilite')->log("{$created} mensualité(s) générée(s) automatiquement pour ".mb_strtolower(Invoice::MONTH_LABELS[$month]));
        }

        $this->info("Mensualités générées : {$created}.");

        return self::SUCCESS;
    }
}

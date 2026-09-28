<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Student;
use Illuminate\Console\Command;

class RetireCqpUmbrellaFormation extends Command
{
    protected $signature = 'app:retire-cqp-umbrella-formation';

    protected $description = "One-time: the CQP formation was a single catch-all fiche covering 6 different specialties (caisse, barista, pâtisserie, cuisine, service, guidage), which made its diploma PDF's specialty wording wrong for most graduates. Each specialty now has its own accurate fiche, so this deactivates CQP (hides it from the public site) without deleting it — any student already linked to it keeps their record intact.";

    public function handle(): int
    {
        $cqp = Formation::where('code', 'CQP')->first();

        if (! $cqp) {
            $this->info('No CQP formation found — nothing to do.');

            return self::SUCCESS;
        }

        $studentCount = Student::where('formation_id', $cqp->id)->count();

        if (! $cqp->is_active) {
            $this->info("CQP already inactive ({$studentCount} linked student(s)) — nothing to do.");

            return self::SUCCESS;
        }

        $cqp->update(['is_active' => false]);

        $this->info("CQP deactivated (hidden from public site, record kept). Linked students: {$studentCount}.");

        return self::SUCCESS;
    }
}

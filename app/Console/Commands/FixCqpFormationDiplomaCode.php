<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Models\Setting;
use Illuminate\Console\Command;

class FixCqpFormationDiplomaCode extends Command
{
    protected $signature = 'app:fix-cqp-diploma-code';

    protected $description = 'One-time: sets the "diploma" abbreviation code on the CQP formation so it stops duplicating text on diploma PDFs and shows its badge on the public site. Guarded to run only once.';

    private const DONE_FLAG = 'fix_cqp_diploma_code_done';

    public function handle(): int
    {
        if (Setting::get(self::DONE_FLAG)) {
            $this->info('Already ran, skipping.');

            return self::SUCCESS;
        }

        $updated = Formation::where('code', 'CQP')->update(['diploma' => 'CQP']);

        Setting::set(self::DONE_FLAG, json_encode(['ran_at' => now()->toDateTimeString(), 'updated' => $updated]));

        $this->info("Updated {$updated} formation(s).");

        return self::SUCCESS;
    }
}

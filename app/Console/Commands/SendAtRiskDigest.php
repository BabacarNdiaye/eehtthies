<?php

namespace App\Console\Commands;

use App\Mail\AtRiskDigest;
use App\Models\Student;
use App\Services\StaffRecipients;
use App\Services\StudentRiskAnalyzer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendAtRiskDigest extends Command
{
    protected $signature = 'app:send-at-risk-digest';

    protected $description = 'Envoie par e-mail au personnel de direction la liste hebdomadaire des élèves à risque (absences, moyennes, impayés).';

    public function handle(StudentRiskAnalyzer $analyzer): int
    {
        $students = $analyzer->analyze();

        if ($students->isEmpty()) {
            $this->info('Aucun élève à risque cette semaine — digest non envoyé.');

            return self::SUCCESS;
        }

        $summary = $analyzer->summarize($students, Student::where('status', 'actif')->count());

        $recipients = StaffRecipients::withPermission('voir_statistiques');

        if ($recipients->isEmpty()) {
            $this->warn('Aucun destinataire (personnel avec la permission voir_statistiques) — digest non envoyé.');

            return self::SUCCESS;
        }

        foreach ($recipients as $recipient) {
            Mail::to($recipient->email)->send(new AtRiskDigest($students, $summary, $recipient->name));
        }

        $this->info("Digest envoyé à {$recipients->count()} destinataire(s) — {$summary['total']} élève(s) à risque.");

        return self::SUCCESS;
    }
}

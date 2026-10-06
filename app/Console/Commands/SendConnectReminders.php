<?php

namespace App\Console\Commands;

use App\Services\ConnectReminders;
use Illuminate\Console\Command;

class SendConnectReminders extends Command
{
    protected $signature = 'app:connect-reminders';

    protected $description = "Publie les rappels automatiques d'EEHT Connect : examens à venir (J-7 et veille) et changements d'emploi du temps regroupés par classe.";

    public function handle(ConnectReminders $reminders): int
    {
        $timetable = $reminders->flushTimetableChanges();
        $exams = $reminders->remindExams();

        $this->info("{$exams} rappel(s) d'examen, {$timetable} classe(s) prévenue(s) d'un changement d'emploi du temps.");

        return self::SUCCESS;
    }
}

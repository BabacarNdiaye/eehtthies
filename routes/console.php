<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Keeps config:cache/route:cache/view:cache fresh on this no-SSH host. Since
// deploys happen by uploading PHP files directly (no artisan access), a
// route/config change wouldn't take effect until the cache is rebuilt —
// this bounds that staleness window to at most an hour instead of forever.
Schedule::command('optimize')->hourly()->onOneServer();

// Automatic backups: dump the database + uploaded media every night, then
// clean up according to the retention policy in config/backup.php, and
// alert by e-mail if a scheduled backup is missing or too large.
Schedule::command('backup:run')->dailyAt('02:00')->onOneServer();
Schedule::command('backup:clean')->dailyAt('03:00')->onOneServer();
Schedule::command('backup:monitor')->dailyAt('04:00')->onOneServer();

// Weekly digest e-mail (Monday 07:00) to staff with voir_statistiques,
// listing students flagged by absences, low grades or overdue invoices.
Schedule::command('app:send-at-risk-digest')->weeklyOn(1, '07:00')->onOneServer();

// Daily overdue-invoice reminder to parents/guardians — the command itself
// only mails at fixed day-overdue milestones (3/7/15/30/60), so running it
// daily does not spam families every day.
Schedule::command('app:send-overdue-invoice-reminders')->dailyAt('08:00')->onOneServer();

// Daily absence alert to parents/guardians — mails only when the student's
// cumulative unjustified-absence count (this school year) hits a milestone
// (3/5/8/12), so running it daily does not spam families every day.
Schedule::command('app:send-absence-alerts')->dailyAt('08:15')->onOneServer();

// Monthly financial recap (1st of month, 07:30) to staff with voir_statistiques.
Schedule::command('app:send-financial-digest')->monthlyOn(1, '07:30')->onOneServer();

// Daily grade-entry reminder to the teacher(s) in charge of an exam whose
// grades are still incomplete — milestone-throttled (3/7 days after the
// exam date), so running it daily does not spam a teacher every day.
Schedule::command('app:send-grade-entry-reminders')->dailyAt('17:00')->onOneServer();

// Daily follow-up to candidates stuck in brouillon/dossier_incomplet —
// milestone-throttled (3/7/14 days of inactivity).
Schedule::command('app:send-candidature-followups')->dailyAt('09:00')->onOneServer();

// Notifications push différées d'EEHT Connect : messages des grands groupes
// et annonces, remis en masse sans bloquer la requête qui les crée
// (voir Messenger::SYNC_PUSH_LIMIT et AnnouncementController::store).
// Rappels automatiques EEHT Connect (examens J-7 / veille, changements
// d'emploi du temps regroupés). Les devoirs et absences partent à
// l'enregistrement.
Schedule::command('app:connect-reminders')->everyFifteenMinutes()->withoutOverlapping()->onOneServer();

Schedule::command('app:push-pending-messages')->everyMinute()->withoutOverlapping()->onOneServer();

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Affiche une citation inspirante');

// Garde les caches config:cache/route:cache/view:cache à jour sur cet hébergement sans SSH. Comme les
// déploiements se font en téléversant directement les fichiers PHP (sans accès à artisan), une modification
// de route ou de configuration ne prendrait pas effet tant que le cache n'est pas reconstruit — cela limite
// cette fenêtre d'obsolescence à une heure au plus au lieu de la laisser indéfinie.
Schedule::command('optimize')->hourly()->onOneServer();

// Sauvegardes automatiques : exporte chaque nuit la base de données + les médias téléversés, puis nettoie
// selon la politique de rétention de config/backup.php, et alerte par e-mail si une sauvegarde planifiée est
// manquante ou trop volumineuse.
Schedule::command('backup:run')->dailyAt('02:00')->onOneServer();
Schedule::command('backup:clean')->dailyAt('03:00')->onOneServer();
Schedule::command('backup:monitor')->dailyAt('04:00')->onOneServer();

// Synthèse hebdomadaire par e-mail (lundi 07h00) aux membres du personnel ayant voir_statistiques, listant
// les élèves signalés pour absences, mauvaises notes ou factures en retard.
Schedule::command('app:send-at-risk-digest')->weeklyOn(1, '07:00')->onOneServer();

// Rappel quotidien des factures en retard aux parents et tuteurs — la commande n'envoie un e-mail qu'à des
// seuils fixes de jours de retard (3/7/15/30/60), donc la lancer chaque jour n'inonde pas les familles de
// messages.
Schedule::command('app:send-overdue-invoice-reminders')->dailyAt('08:00')->onOneServer();

// Alerte quotidienne d'absence aux parents et tuteurs — n'envoie un e-mail que lorsque le total cumulé des
// absences injustifiées de l'élève (cette année scolaire) atteint un seuil (3/5/8/12), donc la lancer chaque
// jour n'inonde pas les familles de messages.
Schedule::command('app:send-absence-alerts')->dailyAt('08:15')->onOneServer();

// Récapitulatif financier mensuel (le 1er du mois, 07h30) aux membres du personnel ayant voir_statistiques.
Schedule::command('app:send-financial-digest')->monthlyOn(1, '07:30')->onOneServer();

// Génération automatique des mensualités (le 1er du mois, 06h00, donc avant le récapitulatif et les relances). La
// commande ne fait rien tant que « Génération automatique des mensualités » n'est pas cochée dans les réglages des
// paiements ; activée, elle crée la mensualité du mois en cours de chaque élève actif, sans jamais en doubler une.
Schedule::command('app:generate-monthly-invoices')->monthlyOn(1, '06:00')->onOneServer();

// Paiement en ligne : interroge le fournisseur sur les tentatives restées sans nouvelle (sa notification a pu se perdre) et
// expire celles qui ont dépassé leur délai. Sans pilote actif, il ne fait qu'expirer les tentatives oubliées.
Schedule::command('app:reconcile-payment-attempts')->everyFiveMinutes()->withoutOverlapping()->onOneServer();

// Rappel quotidien de saisie des notes à l'enseignant ou aux enseignants responsables d'un examen dont les
// notes sont encore incomplètes — limité par seuils (3/7 jours après la date de l'examen), donc la lancer
// chaque jour n'inonde pas un enseignant de messages.
Schedule::command('app:send-grade-entry-reminders')->dailyAt('17:00')->onOneServer();

// Relance quotidienne des candidats bloqués en brouillon/dossier_incomplet — limitée par seuils (3/7/14 jours
// d'inactivité).
Schedule::command('app:send-candidature-followups')->dailyAt('09:00')->onOneServer();

// Notifications push différées d'EEHT Connect : messages des grands groupes
// et annonces, remis en masse sans bloquer la requête qui les crée
// (voir Messenger::SYNC_PUSH_LIMIT et AnnouncementController::store).
// Rappels automatiques EEHT Connect (examens J-7 / veille, changements
// d'emploi du temps regroupés). Les devoirs et absences partent à
// l'enregistrement.
// Conseil de classe : rappel du pré-conseil (J-3) aux enseignants qui n'ont pas fini, et des actions de suivi (J-7,
// échéance) à leurs responsables. Chaque rappel ne tombe qu'un jour.
Schedule::command('app:council-reminders')->dailyAt('07:45')->onOneServer();

Schedule::command('app:connect-reminders')->everyFifteenMinutes()->withoutOverlapping()->onOneServer();

Schedule::command('app:push-pending-messages')->everyMinute()->withoutOverlapping()->onOneServer();

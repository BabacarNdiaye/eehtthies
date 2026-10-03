<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Utilitaire de migration ponctuel : exporte chaque table de contenu réel de la base de développement SQLite
 * locale vers un seul fichier .sql compatible MySQL (instructions INSERT uniquement — pas de CREATE TABLE),
 * pour l'importer via phpMyAdmin dans une base de production fraîchement migrée. Les tables du framework ou
 * transitoires (sessions, cache, jobs en file, suivi des migrations) sont volontairement ignorées ; le
 * journal d'activité l'est aussi, pour que la production démarre un journal d'audit neuf plutôt que d'hériter
 * du bruit des tests locaux.
 */
class ExportDataForProduction extends Command
{
    protected $signature = 'app:export-data-for-production {--output=production-data.sql}';

    protected $description = "Exporte toutes les données réelles sous forme d'instructions INSERT compatibles MySQL, pour passer de la base SQLite locale à une base de production.";

    private const EXCLUDED_TABLES = [
        'migrations', 'sessions', 'cache', 'cache_locks', 'jobs', 'job_batches',
        'failed_jobs', 'password_reset_tokens', 'sqlite_sequence', 'activity_log',
    ];

    public function handle(): int
    {
        $tables = collect(DB::select("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
            ->pluck('name')
            ->reject(fn ($name) => in_array($name, self::EXCLUDED_TABLES, true))
            ->values();

        $output = fopen($this->option('output'), 'w');

        fwrite($output, "-- Généré automatiquement — données réelles EEHT de Thiès pour import en production.\n");
        fwrite($output, "-- Importer via phpMyAdmin APRÈS avoir exécuté `php artisan migrate` sur la base vide.\n\n");
        fwrite($output, "SET FOREIGN_KEY_CHECKS=0;\n\n");

        $totalRows = 0;

        foreach ($tables as $table) {
            $rows = DB::table($table)->get();

            if ($rows->isEmpty()) {
                continue;
            }

            fwrite($output, "-- Table: {$table} ({$rows->count()} ligne(s))\n");
            fwrite($output, "DELETE FROM `{$table}`;\n");

            foreach ($rows->chunk(200) as $chunk) {
                $columns = array_keys((array) $chunk->first());
                $columnList = implode(', ', array_map(fn ($c) => "`{$c}`", $columns));

                $valueLines = $chunk->map(function ($row) use ($columns) {
                    $values = array_map(function ($column) use ($row) {
                        $value = $row->{$column};

                        if (is_null($value)) {
                            return 'NULL';
                        }

                        if (is_int($value) || is_float($value)) {
                            return $value;
                        }

                        // Échappement explicite selon les règles par défaut de MySQL pour les littéraux de
                        // chaîne (non ANSI), plutôt que de s'appuyer sur le quotage de la connexion SQLite
                        // source — SQLite ne fait que doubler les guillemets, alors que MySQL traite aussi
                        // une barre oblique inverse seule comme un caractère d'échappement, ce qui
                        // corromprait tout champ de texte libre en contenant une.
                        $escaped = str_replace(['\\', "'", "\0"], ['\\\\', "\\'", '\\0'], (string) $value);

                        return "'{$escaped}'";
                    }, $columns);

                    return '('.implode(', ', $values).')';
                })->implode(",\n");

                fwrite($output, "INSERT INTO `{$table}` ({$columnList}) VALUES\n{$valueLines};\n");
            }

            fwrite($output, "\n");
            $totalRows += $rows->count();
        }

        fwrite($output, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($output);

        $this->info("Export terminé : {$tables->count()} table(s), {$totalRows} ligne(s) au total.");
        $this->line('Fichier : '.realpath($this->option('output')));

        return self::SUCCESS;
    }
}

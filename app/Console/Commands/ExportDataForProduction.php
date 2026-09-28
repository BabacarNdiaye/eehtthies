<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off migration helper: dumps every real content table from the local
 * SQLite dev database into a single MySQL-compatible .sql file (INSERT
 * statements only — no CREATE TABLE), so it can be imported via phpMyAdmin
 * into a freshly-migrated production database. Framework/transient tables
 * (sessions, cache, queued jobs, migrations bookkeeping) are skipped on
 * purpose; the activity log is also skipped so production starts its audit
 * trail fresh rather than inheriting local testing noise.
 */
class ExportDataForProduction extends Command
{
    protected $signature = 'app:export-data-for-production {--output=production-data.sql}';

    protected $description = 'Export all real data as MySQL-compatible INSERT statements, for moving from local SQLite to a production database.';

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

                        // Escape explicitly for MySQL's default (non-ANSI) string literal
                        // rules, rather than relying on the source SQLite connection's
                        // quoting — SQLite only doubles quotes, but MySQL also treats a
                        // bare backslash as an escape character, which would corrupt any
                        // free-text field that happens to contain one.
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

<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

trait ReadsCsv
{
    /**
     * Lit un CSV (séparateur « , » ou « ; », BOM toléré) et renvoie les lignes
     * non vides sous forme de tableaux associatifs indexés par l'en-tête en
     * minuscules. Renvoie null si le fichier est vide ou illisible.
     *
     * @return array<int, array<string, string>>|null
     */
    protected function readCsvRows(UploadedFile $file): ?array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $firstLine = fgets($handle);

        if ($firstLine === false) {
            fclose($handle);

            return null;
        }

        $firstLine = preg_replace('/^\xEF\xBB\xBF/', '', $firstLine);
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), str_getcsv($firstLine, $delimiter, escape: '\\'));
        $rows = [];

        while (($row = fgetcsv($handle, separator: $delimiter, escape: '\\')) !== false) {
            if ($row === [null] || count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $rows[] = array_map(fn ($v) => trim((string) $v), array_combine($header, array_pad(array_slice($row, 0, count($header)), count($header), '')));
        }

        fclose($handle);

        return $rows;
    }
}

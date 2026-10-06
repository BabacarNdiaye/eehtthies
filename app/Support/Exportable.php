<?php

namespace App\Support;

use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Utilitaires partagés d'export CSV/PDF pour les contrôleurs de listes et de rapports d'administration.
 * $columns : [['key' => 'name', 'label' => 'Nom', 'align' => 'right'?]]
 * $rows : [['name' => 'Awa Diop', ...], ...]
 */
trait Exportable
{
    protected function csvResponse(string $filename, array $columns, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($columns, $rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM UTF-8 pour qu'Excel affiche correctement les accents
            fputcsv($handle, array_map(fn ($c) => $c['label'], $columns), escape: '\\');

            foreach ($rows as $row) {
                fputcsv($handle, array_map(fn ($c) => $row[$c['key']] ?? '', $columns), escape: '\\');
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    protected function pdfResponse(string $filename, string $title, array $columns, iterable $rows, ?string $subtitle = null, array $meta = [])
    {
        $pdf = Pdf::loadView('pdf.table-export', [
            'title' => $title,
            'subtitle' => $subtitle,
            'meta' => $meta,
            'columns' => $columns,
            'rows' => $rows,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream($filename);
    }
}

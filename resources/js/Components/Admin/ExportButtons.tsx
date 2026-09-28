import { FileSpreadsheet, FileText } from 'lucide-react';

export default function ExportButtons({ csvHref, pdfHref }: { csvHref?: string; pdfHref?: string }) {
    return (
        <div className="inline-flex overflow-hidden rounded-lg border border-ink-200">
            {csvHref && (
                <a
                    href={csvHref}
                    className="inline-flex items-center gap-1.5 border-r border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
                    title="Exporter en Excel/CSV"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                </a>
            )}
            {pdfHref && (
                <a
                    href={pdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
                    title="Exporter en PDF"
                >
                    <FileText className="h-4 w-4" />
                    PDF
                </a>
            )}
        </div>
    );
}

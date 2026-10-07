import { Field } from '@/Components/Admin/Field';
import { generatePdfThumbnail } from '@/lib/pdfThumbnail';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DocumentFileField({
    file,
    onFileChange,
    onThumbnailChange,
    error,
    maxMb = 10,
}: {
    file: File | null;
    onFileChange: (file: File | null) => void;
    onThumbnailChange: (thumbnail: File | null) => void;
    error?: string;
    /** Taille maximale acceptée par le serveur (Mo) : au-delà, le fichier est refusé avant l'envoi. */
    maxMb?: number;
}) {
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [tooBig, setTooBig] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleChange = async (selected: File | null) => {
        setTooBig(null);

        if (selected && selected.size > maxMb * 1024 * 1024) {
            const mb = (selected.size / (1024 * 1024)).toFixed(1).replace('.', ',');

            setTooBig(`Ce fichier fait ${mb} Mo : le maximum accepté ici est ${String(maxMb).replace('.', ',')} Mo. Réduisez-le (compression du PDF, images plus légères) ou demandez à l'hébergeur d'augmenter la limite d'envoi.`);
            onFileChange(null);
            onThumbnailChange(null);

            return;
        }

        onFileChange(selected);
        onThumbnailChange(null);
        setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });

        if (!selected || selected.type !== 'application/pdf') return;

        setGenerating(true);
        const thumbnail = await generatePdfThumbnail(selected);
        setGenerating(false);

        if (thumbnail) {
            onThumbnailChange(thumbnail);
            setPreviewUrl(URL.createObjectURL(thumbnail));
        }
    };

    return (
        <Field label="Fichier" required error={tooBig ?? error} hint={`PDF, Word, Excel, PowerPoint ou image — ${String(maxMb).replace('.', ',')} Mo max.`}>
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    aria-label="Fichier"
                    onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
                />
                {generating && <Loader2 className="h-5 w-5 flex-none animate-spin text-ink-400" />}
                {previewUrl && (
                    <img src={previewUrl} alt="Aperçu de la miniature" className="h-14 w-11 flex-none rounded border border-ink-200 object-cover" />
                )}
            </div>
            {file && file.type === 'application/pdf' && !generating && !previewUrl && (
                <p className="mt-1 text-xs text-ink-400">Aucune miniature générée pour ce fichier — l'icône générique sera utilisée.</p>
            )}
        </Field>
    );
}

import { File, FileSpreadsheet, FileText, Link as LinkIcon, Presentation } from 'lucide-react';
import { useState } from 'react';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/** Dégradés sobres, choisis d'après le titre : le même livre garde toujours la même couverture. */
const COVERS = [
    'from-ink-900 to-ink-700',
    'from-[#50022b] to-[#9c1272]',
    'from-emerald-800 to-emerald-600',
    'from-sky-900 to-sky-700',
    'from-gold-800 to-gold-600',
    'from-slate-800 to-slate-600',
    'from-rose-900 to-rose-700',
    'from-teal-900 to-teal-700',
];

const KINDS: Record<string, { label: string; icon: typeof FileText }> = {
    pdf: { label: 'PDF', icon: FileText },
    doc: { label: 'DOC', icon: FileText },
    docx: { label: 'DOC', icon: FileText },
    xls: { label: 'XLS', icon: FileSpreadsheet },
    xlsx: { label: 'XLS', icon: FileSpreadsheet },
    ppt: { label: 'PPT', icon: Presentation },
    pptx: { label: 'PPT', icon: Presentation },
};

export const extensionOf = (filePath: string | null) => (filePath && filePath.includes('.') ? filePath.split('.').pop()!.toLowerCase() : '');

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Couverture d'un livre ou d'un document : l'image fournie (ou la première page) quand elle existe, sinon une couverture
 * générée avec le titre, comme un livre sur une étagère. Un dos de reliure et une ombre donnent l'effet de volume.
 */
export default function BookCover({
    type,
    title,
    filePath,
    thumbnailPath,
    className = '',
}: {
    type: 'document' | 'lien';
    title: string;
    filePath: string | null;
    thumbnailPath?: string | null;
    className?: string;
}) {
    const [broken, setBroken] = useState(false);
    const ext = extensionOf(filePath);
    const image = !broken && (thumbnailPath ? `/storage/${thumbnailPath}` : IMAGE_EXTENSIONS.includes(ext) && filePath ? `/storage/${filePath}` : null);
    const kind = type === 'lien' ? { label: 'LIEN', icon: LinkIcon } : KINDS[ext] ?? { label: ext ? ext.toUpperCase() : 'FICHIER', icon: File };
    const Icon = kind.icon;

    return (
        <div className={`relative aspect-[3/4] overflow-hidden rounded-r-lg rounded-l-sm shadow-[0_10px_24px_-10px_rgba(11,23,40,0.55)] ring-1 ring-black/10 ${className}`}>
            {image ? (
                <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
            ) : (
                <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br p-4 pl-6 text-white ${COVERS[hash(title) % COVERS.length]}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                        <span className="mb-2 block h-0.5 w-8 rounded-full bg-gold-300/80" aria-hidden="true" />
                        <p className="line-clamp-5 font-serif text-base font-bold leading-snug">{title}</p>
                    </div>
                </div>
            )}
            {/* Dos de reliure et reflet */}
            <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/10 to-transparent" aria-hidden="true" />
            <span className="pointer-events-none absolute inset-y-0 left-3 w-px bg-white/20" aria-hidden="true" />
            <span className="absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">{kind.label}</span>
        </div>
    );
}

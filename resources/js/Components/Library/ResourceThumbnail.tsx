import { File, FileSpreadsheet, FileText, Link as LinkIcon, Presentation } from 'lucide-react';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const EXTENSION_STYLES: Record<string, { label: string; icon: typeof FileText; className: string }> = {
    pdf: { label: 'PDF', icon: FileText, className: 'bg-red-100 text-red-700' },
    doc: { label: 'DOC', icon: FileText, className: 'bg-blue-100 text-blue-700' },
    docx: { label: 'DOC', icon: FileText, className: 'bg-blue-100 text-blue-700' },
    xls: { label: 'XLS', icon: FileSpreadsheet, className: 'bg-emerald-100 text-emerald-700' },
    xlsx: { label: 'XLS', icon: FileSpreadsheet, className: 'bg-emerald-100 text-emerald-700' },
    ppt: { label: 'PPT', icon: Presentation, className: 'bg-amber-100 text-amber-700' },
    pptx: { label: 'PPT', icon: Presentation, className: 'bg-amber-100 text-amber-700' },
};

function extensionOf(filePath: string | null): string {
    if (!filePath) return '';
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export default function ResourceThumbnail({
    type,
    filePath,
    thumbnailPath,
    className = '',
}: {
    type: 'document' | 'lien';
    filePath: string | null;
    thumbnailPath?: string | null;
    className?: string;
}) {
    if (type === 'lien') {
        return (
            <div className={`flex items-center justify-center bg-indigo-50 text-indigo-500 ${className}`}>
                <LinkIcon className="h-8 w-8" />
            </div>
        );
    }

    const ext = extensionOf(filePath);
    const imageSrc = thumbnailPath ? `/storage/${thumbnailPath}` : IMAGE_EXTENSIONS.includes(ext) && filePath ? `/storage/${filePath}` : null;

    if (imageSrc) {
        return (
            <div className={`overflow-hidden bg-ink-100 ${className}`}>
                <img src={imageSrc} alt="" className="h-full w-full object-cover" />
            </div>
        );
    }

    const style = EXTENSION_STYLES[ext] ?? { label: ext ? ext.toUpperCase() : 'FICHIER', icon: File, className: 'bg-ink-100 text-ink-500' };
    const Icon = style.icon;

    return (
        <div className={`flex flex-col items-center justify-center gap-1.5 ${style.className} ${className}`}>
            <Icon className="h-8 w-8" />
            <span className="text-[10px] font-bold tracking-wide">{style.label}</span>
        </div>
    );
}

import { File, FileImage, FileMusic, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import { fileKind } from './utils';

const styles = {
    pdf: { bg: 'bg-red-600', icon: FileText, label: 'PDF' },
    word: { bg: 'bg-blue-600', icon: FileText, label: 'W' },
    excel: { bg: 'bg-emerald-600', icon: FileSpreadsheet, label: 'X' },
    powerpoint: { bg: 'bg-orange-500', icon: Presentation, label: 'P' },
    image: { bg: 'bg-purple-600', icon: FileImage, label: 'IMG' },
    audio: { bg: 'bg-gold-600', icon: FileMusic, label: '♪' },
    other: { bg: 'bg-ink-500', icon: File, label: '' },
};

export default function FileIcon({ name, mime, size = 'md' }: { name: string; mime?: string | null; size?: 'sm' | 'md' }) {
    const style = styles[fileKind(name, mime)];
    const Icon = style.icon;

    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-lg text-white ${style.bg} ${
                size === 'sm' ? 'h-8 w-7' : 'h-11 w-9'
            }`}
        >
            <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
    );
}

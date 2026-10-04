import Card from '@/Components/Admin/Card';
import { Attachment } from '@/types';
import { router } from '@inertiajs/react';
import { Download, FileUp, Paperclip, Trash2 } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

type Target = 'expense' | 'invoice' | 'teacher' | 'internship' | 'leave';

interface Props {
    target: Target;
    targetId: number;
    attachments?: Attachment[];
    canManage?: boolean;
    variant?: 'card' | 'compact';
    title?: string;
    hint?: string;
}

const formatSize = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);

export default function AttachmentsPanel({
    target,
    targetId,
    attachments = [],
    canManage = true,
    variant = 'card',
    title = 'Documents',
    hint = 'PDF, JPG, PNG, DOC ou DOCX, 5 Mo maximum.',
}: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const onPick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        router.post(
            route('attachments.store'),
            { target, target_id: targetId, file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setUploading(true),
                onError: (errors) => setError(errors.file ?? errors.target ?? "Le document n'a pas pu être importé."),
                onFinish: () => {
                    setUploading(false);
                    if (input.current) input.current.value = '';
                },
            },
        );
    };

    const remove = (attachment: Attachment) => {
        if (confirm(`Supprimer « ${attachment.original_name} » ?`)) {
            router.delete(route('attachments.destroy', attachment.id), { preserveScroll: true });
        }
    };

    const uploadButton = canManage && (
        <>
            <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={onPick} className="hidden" />
            <button
                type="button"
                disabled={uploading}
                onClick={() => input.current?.click()}
                className={
                    variant === 'compact'
                        ? 'inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-50'
                        : 'inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50'
                }
            >
                <FileUp className={variant === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                {uploading ? 'Importation…' : 'Importer un document'}
            </button>
        </>
    );

    const list = (
        <ul className={variant === 'compact' ? 'mb-2 space-y-1' : 'mt-4 divide-y divide-ink-100'}>
            {attachments.map((a) => (
                <li key={a.id} className={variant === 'compact' ? 'flex items-center gap-2 text-xs' : 'flex items-center justify-between py-3'}>
                    <a
                        href={route('attachments.download', a.id)}
                        className="inline-flex min-w-0 items-center gap-1.5 text-ink-700 hover:text-ink-900"
                    >
                        {variant === 'compact' ? <Paperclip className="h-3.5 w-3.5 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
                        <span className="truncate font-medium">{a.original_name}</span>
                    </a>
                    {variant === 'card' && (
                        <span className="ml-3 hidden shrink-0 text-xs text-ink-500 sm:inline">
                            {formatSize(a.size)}
                            {a.uploader ? ` · ${a.uploader.name}` : ''} · {new Date(a.created_at).toLocaleDateString('fr-FR')}
                        </span>
                    )}
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => remove(a)}
                            aria-label="Supprimer le document"
                            className="ml-auto shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );

    if (variant === 'compact') {
        return (
            <div>
                {attachments.length > 0 && list}
                {uploadButton}
                {attachments.length === 0 && !canManage && <span className="text-ink-500">—</span>}
                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
        );
    }

    return (
        <Card className="mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-serif text-base font-bold text-ink-900">{title}</h2>
                    <p className="text-sm text-ink-500">{hint}</p>
                </div>
                {uploadButton}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {attachments.length === 0 ? <p className="mt-4 text-sm text-ink-500">Aucun document importé.</p> : list}
        </Card>
    );
}

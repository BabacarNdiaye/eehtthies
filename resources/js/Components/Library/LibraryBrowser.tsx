import Card from '@/Components/Admin/Card';
import ResourceThumbnail from '@/Components/Library/ResourceThumbnail';
import { FileText, Link as LinkIcon, LibraryBig, Search } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

export type LibraryResourceRow = {
    id: number;
    title: string;
    description: string | null;
    type: 'document' | 'lien';
    file_path: string | null;
    thumbnail_path: string | null;
    url: string | null;
    uploaded_by: { id: number; name: string } | null;
    created_at: string;
};

type TypeFilter = 'all' | 'document' | 'lien';

function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

export default function LibraryBrowser({
    resources,
    renderActions,
}: {
    resources: LibraryResourceRow[];
    renderActions?: (resource: LibraryResourceRow) => ReactNode;
}) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const counts = useMemo(
        () => ({
            all: resources.length,
            document: resources.filter((r) => r.type === 'document').length,
            lien: resources.filter((r) => r.type === 'lien').length,
        }),
        [resources],
    );

    const filtered = useMemo(() => {
        const q = normalize(search.trim());
        return resources.filter((r) => {
            if (typeFilter !== 'all' && r.type !== typeFilter) return false;
            if (!q) return true;
            return normalize(r.title).includes(q) || normalize(r.description ?? '').includes(q);
        });
    }, [resources, search, typeFilter]);

    const filters: { key: TypeFilter; label: string }[] = [
        { key: 'all', label: 'Tout' },
        { key: 'document', label: 'Documents' },
        { key: 'lien', label: 'Liens' },
    ];

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une ressource…"
                        className="w-full rounded-lg border-ink-200 py-2 pl-9 pr-3 text-sm text-ink-900 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                    />
                </div>
                <div className="flex gap-1.5">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setTypeFilter(f.key)}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                                typeFilter === f.key
                                    ? 'bg-ink-900 text-white'
                                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                            }`}
                        >
                            {f.label}
                            <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-ink-400">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <LibraryBig className="h-6 w-6" />
                        </span>
                        <p className="text-sm">
                            {resources.length === 0 ? 'Aucune ressource pour le moment.' : 'Aucun résultat pour cette recherche.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filtered.map((r) => (
                        <Card key={r.id} className="flex flex-col overflow-hidden p-0">
                            <a
                                href={r.type === 'document' ? `/storage/${r.file_path}` : r.url ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                            >
                                <ResourceThumbnail type={r.type} filePath={r.file_path} thumbnailPath={r.thumbnail_path} className="aspect-[4/3] w-full" />
                            </a>
                            <div className="flex flex-1 flex-col gap-1 p-3.5">
                                <a
                                    href={r.type === 'document' ? `/storage/${r.file_path}` : r.url ?? '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-gold-700"
                                    title={r.title}
                                >
                                    {r.title}
                                </a>
                                {r.description && (
                                    <p className="line-clamp-2 text-xs text-ink-500">{r.description}</p>
                                )}
                                <div className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] text-ink-400">
                                    {r.type === 'document' ? <FileText className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                                    <span className="truncate">{r.uploaded_by?.name ?? '—'}</span>
                                </div>
                            </div>
                            {renderActions && (
                                <div className="flex items-center justify-end gap-1 border-t border-ink-100 px-2 py-1.5">
                                    {renderActions(r)}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

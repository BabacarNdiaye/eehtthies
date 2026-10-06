import BookCover, { extensionOf } from '@/Components/Library/BookCover';
import DocumentViewer, { fileUrl, isViewable } from '@/Components/Library/DocumentViewer';
import { ArrowUpRight, LayoutGrid, LibraryBig, List, Search } from 'lucide-react';
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
type Sort = 'recent' | 'title';
type View = 'shelf' | 'list';

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

const hrefOf = (r: LibraryResourceRow) => (r.type === 'document' ? fileUrl(r) : r.url ?? '#');
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const kindLabel = (r: LibraryResourceRow) => (r.type === 'lien' ? 'Lien' : extensionOf(r.file_path).toUpperCase() || 'Fichier');

export default function LibraryBrowser({
    resources,
    renderActions,
}: {
    resources: LibraryResourceRow[];
    renderActions?: (resource: LibraryResourceRow) => ReactNode;
}) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [sort, setSort] = useState<Sort>('recent');
    const [view, setView] = useState<View>('shelf');
    const [reading, setReading] = useState<LibraryResourceRow | null>(null);

    /** Un document s'ouvre dans le lecteur de la page ; Ctrl/Cmd+clic, clic milieu et les liens gardent le comportement du navigateur. */
    const open = (r: LibraryResourceRow) => (e: React.MouseEvent) => {
        if (!isViewable(r) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        e.preventDefault();
        setReading(r);
    };

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

        return resources
            .filter((r) => (typeFilter === 'all' || r.type === typeFilter) && (!q || normalize(r.title).includes(q) || normalize(r.description ?? '').includes(q)))
            .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title, 'fr') : b.created_at.localeCompare(a.created_at)));
    }, [resources, search, typeFilter, sort]);

    const filters: { key: TypeFilter; label: string }[] = [
        { key: 'all', label: 'Tout' },
        { key: 'document', label: 'Documents' },
        { key: 'lien', label: 'Liens' },
    ];

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un livre, un document…"
                        aria-label="Rechercher dans la bibliothèque"
                        className="w-full rounded-xl border-ink-200 py-2.5 pl-9 pr-3 text-sm text-ink-900 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                    />
                </div>
                <div role="tablist" aria-label="Type de ressource" className="inline-flex gap-1 rounded-xl bg-ink-50 p-1">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={typeFilter === f.key}
                            onClick={() => setTypeFilter(f.key)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${typeFilter === f.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                        >
                            {f.label}
                            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${typeFilter === f.key ? 'bg-ink-900 text-white' : 'bg-ink-200/70 text-ink-600'}`}>{counts[f.key]}</span>
                        </button>
                    ))}
                </div>
                <select
                    aria-label="Trier"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="rounded-xl border-ink-200 py-2.5 text-sm text-ink-700 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                >
                    <option value="recent">Plus récents</option>
                    <option value="title">Titre (A–Z)</option>
                </select>
                <div className="ml-auto inline-flex gap-1 rounded-xl bg-ink-50 p-1" role="group" aria-label="Affichage">
                    {([
                        ['shelf', 'Étagère', LayoutGrid],
                        ['list', 'Liste', List],
                    ] as const).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={view === key}
                            onClick={() => setView(key)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="max-sm:sr-only">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-ink-400">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-50">
                        <LibraryBig className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <p className="text-sm">{resources.length === 0 ? "La bibliothèque est vide pour l'instant." : 'Aucun résultat pour cette recherche.'}</p>
                </div>
            ) : view === 'shelf' ? (
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {filtered.map((r) => (
                        <article key={r.id} className="group flex flex-col">
                            <a href={hrefOf(r)} onClick={open(r)} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${r.title}`} className="block rounded-lg outline-none transition duration-200 group-hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                                <BookCover type={r.type} title={r.title} filePath={r.file_path} thumbnailPath={r.thumbnail_path} />
                            </a>
                            <div className="mt-3 min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900" title={r.title}>
                                    <a href={hrefOf(r)} onClick={open(r)} target="_blank" rel="noreferrer" className="outline-none hover:text-gold-700 focus-visible:underline">
                                        {r.title}
                                    </a>
                                </h3>
                                {r.description && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{r.description}</p>}
                                <p className="mt-1.5 truncate text-[11px] text-ink-400">
                                    {r.uploaded_by?.name ?? '—'} · {dateFr(r.created_at)}
                                </p>
                            </div>
                            {renderActions && <div className="mt-2 flex items-center gap-1">{renderActions(r)}</div>}
                        </article>
                    ))}
                </div>
            ) : (
                <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
                    {filtered.map((r) => (
                        <li key={r.id} className="flex items-center gap-4 p-3 sm:p-4">
                            <a href={hrefOf(r)} onClick={open(r)} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${r.title}`} className="w-14 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                                <BookCover type={r.type} title={r.title} filePath={r.file_path} thumbnailPath={r.thumbnail_path} />
                            </a>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-ink-900">{r.title}</h3>
                                {r.description && <p className="line-clamp-1 text-xs text-ink-500">{r.description}</p>}
                                <p className="mt-0.5 text-[11px] text-ink-400">
                                    {kindLabel(r)} · {r.uploaded_by?.name ?? '—'} · {dateFr(r.created_at)}
                                </p>
                            </div>
                            <a href={hrefOf(r)} onClick={open(r)} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 sm:inline-flex">
                                Ouvrir <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                            {renderActions && <div className="flex items-center gap-1">{renderActions(r)}</div>}
                        </li>
                    ))}
                </ul>
            )}
            <DocumentViewer resource={reading} onClose={() => setReading(null)} />
        </div>
    );
}

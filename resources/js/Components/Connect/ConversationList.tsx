import { FileText, Loader2, MessageSquareText, Plus, Search } from 'lucide-react';
import Avatar, { groupIconFor } from './Avatar';
import { ConversationSummary, SearchResult, Tab } from './types';
import { listTime } from './utils';

const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'direct', label: 'Privées' },
    { key: 'group', label: 'Groupes' },
    { key: 'favorites', label: 'Favoris' },
];

export function filterConversations(conversations: ConversationSummary[], tab: Tab, search: string): ConversationSummary[] {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
        if (tab === 'direct' && c.type === 'group') return false;
        if (tab === 'group' && c.type !== 'group') return false;
        if (tab === 'favorites' && !c.is_favorite) return false;
        if (q && !c.name.toLowerCase().includes(q) && !(c.last?.body ?? '').toLowerCase().includes(q)) return false;
        return true;
    });
}

export default function ConversationList({
    conversations,
    loading,
    activeId,
    tab,
    onTab,
    search,
    onSearch,
    onOpen,
    onNew,
    searchResults,
    onOpenResult,
}: {
    conversations: ConversationSummary[];
    loading: boolean;
    activeId: number | null;
    tab: Tab;
    onTab: (t: Tab) => void;
    search: string;
    onSearch: (v: string) => void;
    onOpen: (id: number) => void;
    onNew: () => void;
    searchResults: SearchResult[] | 'loading' | null;
    onOpenResult: (result: SearchResult) => void;
}) {
    const countFor = (t: Tab) => filterConversations(conversations, t, '').filter((c) => c.unread > 0).length;
    const visible = filterConversations(conversations, tab, search);

    return (
        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 p-4 pb-3">
                <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                    <input
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Rechercher une conversation..."
                        className="w-full rounded-xl border border-ink-200 py-2.5 pl-10 pr-3 text-[13px] placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                </label>
                <button
                    onClick={onNew}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white hover:bg-ink-800"
                    aria-label="Nouvelle conversation"
                    title="Nouvelle conversation"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center justify-between border-b border-ink-100 px-2">
                {tabs.map((t) => {
                    const count = t.key === 'favorites' ? 0 : countFor(t.key);
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => onTab(t.key)}
                            className={`relative flex items-center gap-1 whitespace-nowrap rounded-t-md px-2 py-2.5 text-[12px] font-medium transition-colors ${
                                active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
                            }`}
                        >
                            {t.label}
                            {count > 0 && (
                                <span
                                    className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                                        active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                            {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded bg-ink-900" />}
                        </button>
                    );
                })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {loading && <p className="px-4 py-8 text-center text-sm text-ink-400">Chargement…</p>}
                {!loading && visible.length === 0 && !searchResults && (
                    <p className="px-4 py-8 text-center text-sm text-ink-400">
                        {search ? 'Aucun résultat.' : tab === 'favorites' ? 'Aucune conversation en favori.' : 'Aucune conversation.'}
                    </p>
                )}
                {visible.map((c) => {
                    const active = c.id === activeId;
                    return (
                        <button
                            key={c.id}
                            onClick={() => onOpen(c.id)}
                            className={`relative flex w-full items-start gap-3 border-b border-ink-50 px-3 py-3.5 text-left transition-colors last:border-0 ${
                                active ? 'rounded-xl bg-blue-50/80' : 'hover:bg-ink-50/70'
                            }`}
                        >
                            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-ink-900" />}
                            <Avatar
                                name={c.name}
                                src={c.avatar}
                                group={c.type !== 'direct'}
                                groupIcon={groupIconFor(c.name, c.is_class, c.type)}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                    <span className={`truncate text-[13px] text-ink-900 ${c.unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                                        {c.name}
                                    </span>
                                    <span className="shrink-0 pt-0.5 text-[11px] text-ink-400">
                                        {c.last ? listTime(c.last.created_at) : ''}
                                    </span>
                                </span>
                                {c.other?.online && (
                                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-600">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> En ligne
                                    </span>
                                )}
                                <span className="mt-1 flex items-center justify-between gap-2">
                                    <span className={`truncate text-xs ${c.unread > 0 ? 'text-ink-700' : 'text-ink-400'}`}>
                                        {c.last
                                            ? `${c.type === 'group' && c.last.sender_name ? `${c.last.sender_name.split(' ')[0]} : ` : c.last.sender_name === 'Vous' ? 'Vous : ' : ''}${c.last.body}`
                                            : c.type === 'group'
                                              ? `${c.members_count} membres`
                                              : 'Nouvelle conversation'}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-1">
                                        {c.mentions > 0 && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[11px] font-bold text-ink-900" title="Vous avez été mentionné(e)">
                                                @
                                            </span>
                                        )}
                                        {c.unread > 0 && (
                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1.5 text-[10px] font-bold text-white">
                                                {c.unread}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </span>
                        </button>
                    );
                })}

                {searchResults && (
                    <div className="mt-2 border-t border-ink-100 pt-3">
                        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Dans les messages</p>
                        {searchResults === 'loading' && (
                            <p className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche…
                            </p>
                        )}
                        {searchResults !== 'loading' && searchResults.length === 0 && <p className="px-3 py-2 text-xs text-ink-400">Aucun message trouvé.</p>}
                        {searchResults !== 'loading' &&
                            searchResults.map((r) => (
                                <button key={r.id} onClick={() => onOpenResult(r)} className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50/70">
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-600">
                                        {r.is_file ? <FileText className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex justify-between gap-2">
                                            <span className="truncate text-xs font-semibold text-ink-900">{r.conversation_name}</span>
                                            <span className="shrink-0 text-[10px] text-ink-400">{listTime(r.created_at)}</span>
                                        </span>
                                        <span className="block text-[11px] text-ink-500">{r.sender_name}</span>
                                        <span className="line-clamp-2 text-xs text-ink-700">
                                            <Highlight text={r.snippet} query={search} />
                                        </span>
                                    </span>
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function Highlight({ text, query }: { text: string; query: string }) {
    const q = query.trim();
    if (!q) return <>{text}</>;
    const index = text.toLowerCase().indexOf(q.toLowerCase());
    if (index < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, index)}
            <mark className="rounded bg-gold-200 px-0.5 text-ink-900">{text.slice(index, index + q.length)}</mark>
            {text.slice(index + q.length)}
        </>
    );
}

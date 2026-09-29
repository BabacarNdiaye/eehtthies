import { AlertTriangle, Briefcase, CalendarClock, Check, Download, GraduationCap, KeyRound, LayoutDashboard, Mail, Megaphone, MessageSquareText, Search, Smartphone, Users, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import Avatar from './Avatar';
import FileIcon from './FileIcon';
import { Announcement, ConnectLinks, DocumentItem, Person, Profile } from './types';
import { formatSize, shortDate } from './utils';

function Panel({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
    return (
        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div>
                    <h2 className="font-serif text-lg font-bold text-ink-900">{title}</h2>
                    {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
                </div>
                {actions}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </section>
    );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-64 max-w-full rounded-xl border border-ink-200 py-2 pl-9 pr-3 text-[13px] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
        </label>
    );
}

// ---------------------------------------------------------------------------

const priorityStyles = {
    normale: 'bg-ink-100 text-ink-700',
    importante: 'bg-gold-100 text-gold-800',
    urgente: 'bg-red-100 text-red-700',
};

export function AnnouncementsSection({ onRead }: { onRead: () => void }) {
    const [items, setItems] = useState<Announcement[] | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        window.axios.get(route('connect.announcements')).then((res) => setItems(res.data.announcements));
    }, []);

    const open = (a: Announcement) => {
        setOpenId(openId === a.id ? null : a.id);
        if (!a.read) {
            window.axios.post(route('connect.announcements.read', a.id)).then(onRead);
            setItems((prev) => prev?.map((x) => (x.id === a.id ? { ...x, read: true } : x)) ?? null);
        }
    };

    return (
        <Panel title="Annonces" subtitle="Communications officielles de l'établissement.">
            {!items && <p className="p-8 text-center text-sm text-ink-400">Chargement…</p>}
            {items?.length === 0 && (
                <div className="flex flex-col items-center gap-3 p-12 text-ink-400">
                    <Megaphone className="h-10 w-10" />
                    <p className="text-sm">Aucune annonce pour le moment.</p>
                </div>
            )}
            <ul className="divide-y divide-ink-100">
                {items?.map((a) => (
                    <li key={a.id}>
                        <button onClick={() => open(a)} className={`flex w-full gap-4 px-5 py-4 text-left hover:bg-ink-50/60 ${a.read ? '' : 'bg-gold-50/40'}`}>
                            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${a.priority === 'urgente' ? 'bg-red-600' : 'bg-ink-900'} text-white`}>
                                {a.priority === 'urgente' ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className={`text-sm text-ink-900 ${a.read ? 'font-medium' : 'font-bold'}`}>{a.title}</span>
                                    {a.priority !== 'normale' && (
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[a.priority]}`}>{a.priority}</span>
                                    )}
                                    {!a.read && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-ink-500">
                                    {a.author ?? 'Administration'} · {shortDate(a.created_at)}
                                </span>
                                <span className={`mt-2 block whitespace-pre-line text-[13px] text-ink-700 ${openId === a.id ? '' : 'line-clamp-2'}`}>{a.body}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

// ---------------------------------------------------------------------------

export function DocumentsSection({ onOpenConversation }: { onOpenConversation: (id: number, messageId?: number) => void }) {
    const [items, setItems] = useState<DocumentItem[] | null>(null);
    const [q, setQ] = useState('');

    useEffect(() => {
        const t = setTimeout(() => {
            window.axios.get(route('connect.documents'), { params: { q } }).then((res) => setItems(res.data.documents));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    return (
        <Panel title="Documents" subtitle="Tous les fichiers échangés dans vos conversations." actions={<SearchInput value={q} onChange={setQ} placeholder="Rechercher un fichier…" />}>
            {!items && <p className="p-8 text-center text-sm text-ink-400">Chargement…</p>}
            {items?.length === 0 && <p className="p-8 text-center text-sm text-ink-400">Aucun document.</p>}
            <ul className="divide-y divide-ink-100">
                {items?.map((d) => (
                    <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                        <FileIcon name={d.name} mime={d.mime} />
                        <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-ink-900">{d.name}</p>
                            <p className="text-[11px] text-ink-500">
                                {formatSize(d.size)} • {shortDate(d.created_at)} • {d.sender_name ?? '—'}
                            </p>
                        </a>
                        <button onClick={() => onOpenConversation(d.conversation_id, d.id)} className="hidden truncate text-xs text-blue-700 hover:underline sm:block sm:max-w-[180px]">
                            {d.conversation_name}
                        </button>
                        <a href={`${d.url}?download=1`} className="rounded-md p-1.5 text-ink-600 hover:bg-ink-50" aria-label="Télécharger">
                            <Download className="h-4 w-4" />
                        </a>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

// ---------------------------------------------------------------------------

const roleFilters = [
    { key: '', label: 'Tous' },
    { key: 'enseignant', label: 'Enseignants' },
    { key: 'eleve', label: 'Élèves' },
    { key: 'administration', label: 'Administration' },
    { key: 'parent', label: 'Parents' },
];

function useContacts(q: string, role: string) {
    const [contacts, setContacts] = useState<Person[] | null>(null);
    useEffect(() => {
        const t = setTimeout(() => {
            window.axios.get(route('connect.contacts'), { params: { q, role } }).then((res) => setContacts(res.data.contacts));
        }, 250);
        return () => clearTimeout(t);
    }, [q, role]);
    return contacts;
}

export function ContactsSection({ onMessage, onNewGroup, canCreateGroups }: { onMessage: (userId: number) => void; onNewGroup: () => void; canCreateGroups: boolean }) {
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const contacts = useContacts(q, role);

    return (
        <Panel
            title="Contacts"
            subtitle="Écrivez à un enseignant, un élève ou un membre de l'administration."
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <SearchInput value={q} onChange={setQ} placeholder="Rechercher une personne…" />
                    {canCreateGroups && (
                        <button onClick={onNewGroup} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-800">
                            <Users className="h-4 w-4" /> Nouveau groupe
                        </button>
                    )}
                </div>
            }
        >
            <div className="flex flex-wrap gap-2 px-5 pt-4">
                {roleFilters.map((r) => (
                    <button
                        key={r.key}
                        onClick={() => setRole(r.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${role === r.key ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
            {!contacts && <p className="p-8 text-center text-sm text-ink-400">Chargement…</p>}
            {contacts?.length === 0 && <p className="p-8 text-center text-sm text-ink-400">Aucun contact trouvé.</p>}
            <ul className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3">
                {contacts?.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                        <Avatar name={c.name} src={c.avatar} online={c.online} />
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[13px] font-semibold text-ink-900">{c.name}</span>
                            <span className="block truncate text-[11px] text-ink-500">{[c.role, c.subtitle].filter(Boolean).join(' · ')}</span>
                        </span>
                        <button onClick={() => onMessage(c.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800" aria-label={`Écrire à ${c.name}`}>
                            <MessageSquareText className="h-4 w-4" />
                        </button>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

// ---------------------------------------------------------------------------

export function ProfileSection({ me, links }: { me: Profile; links: ConnectLinks }) {
    const rows = [
        { icon: Mail, label: 'Email', value: me.email },
        { icon: Smartphone, label: 'Téléphone', value: me.phone },
        { icon: GraduationCap, label: 'Formation', value: me.formation },
        { icon: Briefcase, label: 'Poste', value: me.position },
        { icon: CalendarClock, label: 'Disponibilité', value: me.availability },
    ].filter((r) => r.value);

    return (
        <Panel title="Mon profil" subtitle="Ce que les autres voient de vous dans EEHT Connect.">
            <div className="mx-auto max-w-xl p-6">
                <div className="flex items-center gap-5">
                    <Avatar name={me.name} src={me.avatar} size="lg" online />
                    <div>
                        <p className="font-serif text-xl font-bold text-ink-900">{me.name}</p>
                        <p className="text-sm text-ink-600">{[me.role, me.subtitle].filter(Boolean).join(' · ')}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
                            <Check className="h-3.5 w-3.5" /> En ligne
                        </p>
                    </div>
                </div>
                {me.about && <p className="mt-6 text-sm leading-relaxed text-ink-700">{me.about}</p>}
                <div className="mt-6 divide-y divide-ink-100 rounded-xl border border-ink-100">
                    {rows.map((r) => (
                        <div key={r.label} className="flex items-center gap-4 px-4 py-3">
                            <r.icon className="h-5 w-5 text-ink-600" />
                            <div>
                                <p className="text-[11px] text-ink-500">{r.label}</p>
                                <p className="text-sm text-ink-900">{r.value}</p>
                            </div>
                        </div>
                    ))}
                    {rows.length === 0 && <p className="px-4 py-3 text-sm text-ink-400">Aucune information complémentaire.</p>}
                </div>
                <p className="mt-3 text-xs text-ink-500">Pour modifier ces informations, adressez-vous à l'administration.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <a href={links.home} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
                        <LayoutDashboard className="h-4 w-4" /> Mon espace
                    </a>
                    {links.password && (
                        <a href={links.password} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                            <KeyRound className="h-4 w-4" /> Changer mon mot de passe
                        </a>
                    )}
                </div>
            </div>
        </Panel>
    );
}

// ---------------------------------------------------------------------------

/**
 * Création d'un groupe, ou ajout de membres à un groupe existant (`addTo`).
 */
export function NewGroupModal({
    onClose,
    onCreated,
    addTo,
}: {
    onClose: () => void;
    onCreated: (id: number) => void;
    addTo?: { conversationId: number; existingIds: number[] };
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const [selected, setSelected] = useState<Person[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const allContacts = useContacts(q, role);
    const contacts = addTo ? allContacts?.filter((c) => !addTo.existingIds.includes(c.id)) : allContacts;

    const toggle = (p: Person) =>
        setSelected((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));

    const addAll = () =>
        setSelected((prev) => [...prev, ...(contacts ?? []).filter((c) => !prev.some((x) => x.id === c.id))]);

    const create = async () => {
        setSaving(true);
        setError(null);
        try {
            if (addTo) {
                await window.axios.post(route('connect.members.add', addTo.conversationId), { user_ids: selected.map((s) => s.id) });
                onCreated(addTo.conversationId);
                return;
            }
            const res = await window.axios.post(route('connect.groups.store'), {
                name,
                description: description || null,
                member_ids: selected.map((s) => s.id),
            });
            onCreated(res.data.id);
        } catch (e: unknown) {
            const response = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
            setError(Object.values(response?.data?.errors ?? {})[0]?.[0] ?? response?.data?.message ?? 'Le groupe n’a pas pu être créé.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-elevated" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
                    <h2 className="font-serif text-lg font-bold text-ink-900">{addTo ? 'Ajouter des membres' : 'Nouveau groupe'}</h2>
                    <button onClick={onClose} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-50" aria-label="Fermer">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div className={`grid gap-3 sm:grid-cols-2 ${addTo ? 'hidden' : ''}`}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom du groupe (ex. Projet Gala)"
                            className="rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                        />
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (facultative)"
                            className="rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                        />
                    </div>

                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selected.map((s) => (
                                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 py-1 pl-3 pr-1.5 text-xs text-white">
                                    {s.name}
                                    <button onClick={() => toggle(s)} className="rounded-full p-0.5 hover:bg-white/20" aria-label={`Retirer ${s.name}`}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <SearchInput value={q} onChange={setQ} placeholder="Ajouter des membres…" />
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-ink-200 py-2 text-[13px]">
                            {roleFilters.map((r) => (
                                <option key={r.key} value={r.key}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={addAll} className="text-xs font-medium text-blue-700 hover:underline">
                            Tout ajouter
                        </button>
                    </div>

                    <ul className="max-h-72 divide-y divide-ink-50 overflow-y-auto rounded-xl border border-ink-100">
                        {!contacts && <li className="p-4 text-center text-sm text-ink-400">Chargement…</li>}
                        {contacts?.map((c) => {
                            const checked = selected.some((s) => s.id === c.id);
                            return (
                                <li key={c.id}>
                                    <button onClick={() => toggle(c)} className={`flex w-full items-center gap-3 px-3 py-2 text-left ${checked ? 'bg-blue-50/70' : 'hover:bg-ink-50'}`}>
                                        <Avatar name={c.name} src={c.avatar} size="sm" />
                                        <span className="min-w-0 flex-1 leading-tight">
                                            <span className="block truncate text-[13px] font-medium text-ink-900">{c.name}</span>
                                            <span className="block truncate text-[11px] text-ink-500">{[c.role, c.subtitle].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300'}`}>
                                            {checked && <Check className="h-3.5 w-3.5" />}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-ink-100 px-6 py-4">
                    <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50">
                        Annuler
                    </button>
                    <button
                        onClick={create}
                        disabled={saving || (!addTo && !name.trim()) || selected.length === 0}
                        className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-40"
                    >
                        {addTo ? 'Ajouter' : 'Créer le groupe'} ({selected.length} membre{selected.length > 1 ? 's' : ''})
                    </button>
                </div>
            </div>
        </div>
    );
}

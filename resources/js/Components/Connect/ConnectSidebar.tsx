import { usePage } from '@inertiajs/react';
import { ArrowRightFromLine, CalendarDays, FileText, Megaphone, MessageSquareText, Settings, User, Users, UsersRound, X } from 'lucide-react';
import { PageProps } from '@/types';
import SiteLogo from '@/Components/SiteLogo';
import Avatar, { groupIconFor } from './Avatar';
import { ConnectLinks, ConversationSummary, Section } from './types';

function Badge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-ink-900">
            {count > 99 ? '99+' : count}
        </span>
    );
}

export default function ConnectSidebar({
    section,
    onSection,
    unreadMessages,
    unreadAnnouncements,
    groups,
    onOpenConversation,
    links,
    open,
    onClose,
}: {
    section: Section;
    onSection: (s: Section) => void;
    unreadMessages: number;
    unreadAnnouncements: number;
    groups: ConversationSummary[];
    onOpenConversation: (id: number) => void;
    links: ConnectLinks;
    open: boolean;
    onClose: () => void;
}) {
    const { siteSettings } = usePage<PageProps>().props;

    const items: { key: Section | 'calendar'; label: string; icon: typeof Users; badge?: number }[] = [
        { key: 'messages', label: 'Messages', icon: MessageSquareText, badge: unreadMessages },
        { key: 'groups', label: 'Groupes', icon: Users },
        { key: 'announcements', label: 'Annonces', icon: Megaphone, badge: unreadAnnouncements },
        { key: 'documents', label: 'Documents', icon: FileText },
        { key: 'calendar', label: 'Calendrier', icon: CalendarDays },
        { key: 'contacts', label: 'Contacts', icon: UsersRound },
        { key: 'profile', label: 'Mon profil', icon: User },
    ];

    const content = (
        <div className="flex h-full flex-col bg-gradient-to-b from-ink-900 to-ink-950 text-white">
            <div className="flex items-center gap-3 border-l-4 border-gold-500 px-5 py-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/60">
                    <SiteLogo size={30} tone="gold" />
                </span>
                <div className="leading-tight">
                    <p className="font-serif text-xl font-bold">EEHT Connect</p>
                    <p className="mt-0.5 text-[11px] text-white/70">Communiquer • Collaborer • Réussir</p>
                </div>
                <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Fermer le menu">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <nav className="space-y-1 px-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.key === section;
                    const className = `flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        active ? 'bg-white/10 text-white shadow-inner' : 'text-white/85 hover:bg-white/5 hover:text-white'
                    }`;

                    if (item.key === 'calendar') {
                        return links.calendar ? (
                            <a key={item.key} href={links.calendar} className={className}>
                                <Icon className="h-5 w-5 shrink-0" /> {item.label}
                            </a>
                        ) : null;
                    }

                    return (
                        <button key={item.key} onClick={() => onSection(item.key as Section)} className={className}>
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                            <Badge count={item.badge ?? 0} />
                        </button>
                    );
                })}
            </nav>

            <div className="mx-5 my-5 h-px bg-white/10" />

            <div className="min-h-0 flex-1 overflow-y-auto px-3">
                <div className="mb-2 flex items-center justify-between px-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Mes groupes</p>
                    <button onClick={() => onSection('groups')} className="text-[11px] text-white/70 hover:text-gold-400">
                        Tout voir
                    </button>
                </div>
                {groups.length === 0 && <p className="px-2 py-2 text-xs text-white/50">Aucun groupe pour le moment.</p>}
                {groups.slice(0, 5).map((g) => (
                    <button
                        key={g.id}
                        onClick={() => onOpenConversation(g.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                    >
                        <Avatar name={g.name} src={g.avatar} size="sm" group groupIcon={groupIconFor(g.name, g.is_class)} />
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[13px] font-medium">{g.name}</span>
                            <span className="text-[11px] text-white/60">{g.members_count} membres</span>
                        </span>
                        <Badge count={g.unread} />
                    </button>
                ))}

                <div
                    className="relative mx-1 mb-4 mt-5 hidden overflow-hidden rounded-xl border border-white/10 p-4 lg:block"
                    style={
                        siteSettings.about_photo
                            ? { backgroundImage: `url(/storage/${siteSettings.about_photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : undefined
                    }
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-900/85 to-ink-800/60" />
                    <div className="relative">
                        <p className="font-serif text-[15px] font-semibold leading-snug">
                            Ensemble pour
                            <br />
                            la réussite de nos étudiants.
                        </p>
                        <div className="mt-4 flex justify-center">
                            <SiteLogo size={40} tone="gold" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <a href={links.password ?? links.home} className="flex items-center gap-3 text-sm text-white/85 hover:text-white">
                    <Settings className="h-5 w-5" /> Paramètres
                </a>
                <a href={links.home} className="rounded-lg p-1.5 text-white/85 hover:bg-white/10 hover:text-white" title="Retour à mon espace">
                    <ArrowRightFromLine className="h-5 w-5" />
                </a>
            </div>
        </div>
    );

    return (
        <>
            <aside className="hidden w-[244px] shrink-0 lg:block">{content}</aside>
            <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
                <div className={`absolute inset-0 bg-ink-950/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
                <aside
                    className={`absolute inset-y-0 left-0 w-[270px] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {content}
                </aside>
            </div>
        </>
    );
}

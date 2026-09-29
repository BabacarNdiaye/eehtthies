import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAutoPushSubscribe from '@/hooks/useAutoPushSubscribe';
import ChatPane from '@/Components/Connect/ChatPane';
import ConnectHeader from '@/Components/Connect/ConnectHeader';
import ConnectSidebar from '@/Components/Connect/ConnectSidebar';
import ConversationList from '@/Components/Connect/ConversationList';
import InfoPanel from '@/Components/Connect/InfoPanel';
import { AnnouncementsSection, ContactsSection, DocumentsSection, NewGroupModal, ProfileSection } from '@/Components/Connect/Sections';
import { ChatMessage, ConnectLinks, ConversationDetails, ConversationSummary, Profile, Section, Tab } from '@/Components/Connect/types';

interface Props {
    me: Profile;
    canCreateGroups: boolean;
    links: ConnectLinks;
    initial: { conversation: number | null; class: number | null; user: number | null; section: string | null };
}

const SECTIONS: Section[] = ['messages', 'groups', 'announcements', 'documents', 'contacts', 'profile'];

export default function ConnectIndex({ me, canCreateGroups, links, initial }: Props) {
    useAutoPushSubscribe();

    const initialSection = SECTIONS.includes(initial.section as Section) ? (initial.section as Section) : 'messages';

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [section, setSection] = useState<Section>(initialSection);
    const [tab, setTab] = useState<Tab>(initialSection === 'groups' ? 'group' : 'all');
    const [search, setSearch] = useState('');
    const [infoOpen, setInfoOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1280);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [details, setDetails] = useState<ConversationDetails | null>(null);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const activeIdRef = useRef<number | null>(null);
    activeIdRef.current = activeId;

    const active = conversations.find((c) => c.id === activeId) ?? null;
    const groups = useMemo(() => conversations.filter((c) => c.type === 'group'), [conversations]);
    const unreadMessages = conversations.reduce((sum, c) => sum + c.unread, 0);

    const loadConversations = useCallback(async (silent = false) => {
        if (!silent) setLoadingList(true);
        try {
            const res = await window.axios.get(route('connect.conversations'));
            // La conversation ouverte est lue au fil de l'eau : ne pas y réafficher de badge.
            setConversations(
                (res.data.conversations as ConversationSummary[]).map((c) => (c.id === activeIdRef.current ? { ...c, unread: 0 } : c)),
            );
        } finally {
            if (!silent) setLoadingList(false);
        }
    }, []);

    const loadUnread = useCallback(async () => {
        try {
            const res = await window.axios.get(route('connect.unread-count'));
            setUnreadAnnouncements(res.data.announcements);
        } catch {
            // Réessai au prochain passage.
        }
    }, []);

    const openConversation = useCallback((id: number) => {
        setActiveId(id);
        setSection((s) => (s === 'groups' ? 'groups' : 'messages'));
        setSidebarOpen(false);
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
        window.history.replaceState(null, '', `/connect?conversation=${id}`);
    }, []);

    // Chargement initial + ouverture demandée par l'URL (?conversation, ?class, ?user).
    useEffect(() => {
        (async () => {
            await loadConversations();
            loadUnread();
            try {
                if (initial.conversation) openConversation(initial.conversation);
                else if (initial.class) {
                    const res = await window.axios.get(route('connect.class', initial.class));
                    openConversation(res.data.id);
                } else if (initial.user) {
                    const res = await window.axios.post(route('connect.direct'), { user_id: initial.user });
                    await loadConversations(true);
                    openConversation(res.data.id);
                }
            } catch {
                // Conversation introuvable ou non autorisée : on reste sur la liste.
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const list = setInterval(() => loadConversations(true), 8000);
        const unread = setInterval(loadUnread, 20000);
        return () => {
            clearInterval(list);
            clearInterval(unread);
        };
    }, [loadConversations, loadUnread]);

    const loadDetails = useCallback(async (id: number) => {
        try {
            const res = await window.axios.get(route('connect.details', id));
            if (activeIdRef.current === id) setDetails(res.data);
        } catch {
            setDetails(null);
        }
    }, []);

    useEffect(() => {
        setDetails(null);
        if (activeId) loadDetails(activeId);
    }, [activeId, loadDetails]);

    const onSent = useCallback(
        (message: ChatMessage) => {
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeIdRef.current
                        ? {
                              ...c,
                              last: { body: message.body ?? `📎 ${message.attachment?.name ?? ''}`, sender_name: 'Vous', created_at: message.created_at },
                              last_message_at: message.created_at,
                          }
                        : c,
                ),
            );
            if (message.attachment && activeIdRef.current) loadDetails(activeIdRef.current);
        },
        [loadDetails],
    );

    const toggleFavorite = async () => {
        if (!active) return;
        const res = await window.axios.post(route('connect.favorite', active.id));
        setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, is_favorite: res.data.is_favorite } : c)));
    };

    const markUnread = async () => {
        if (!active) return;
        await window.axios.post(route('connect.unread', active.id));
        setActiveId(null);
        window.history.replaceState(null, '', '/connect');
        loadConversations(true);
    };

    const leave = async () => {
        if (!active || !confirm(`Quitter le groupe « ${active.name} » ?`)) return;
        await window.axios.post(route('connect.leave', active.id));
        setActiveId(null);
        window.history.replaceState(null, '', '/connect');
        loadConversations(true);
    };

    const messageUser = async (userId: number) => {
        const res = await window.axios.post(route('connect.direct'), { user_id: userId });
        await loadConversations(true);
        setSection('messages');
        setTab('all');
        openConversation(res.data.id);
    };

    const changeSection = (s: Section) => {
        setSection(s);
        setSidebarOpen(false);
        if (s === 'groups') setTab('group');
        if (s === 'messages') setTab('all');
    };

    const changeTab = (t: Tab) => {
        setTab(t);
        setSection(t === 'group' ? 'groups' : 'messages');
    };

    const focusComposer = () => document.getElementById('connect-composer')?.focus();
    const isChat = section === 'messages' || section === 'groups';

    return (
        <div className="flex h-[100dvh] flex-col bg-[#f3f5f9] text-ink-900">
            <Head title="EEHT Connect" />
            <ConnectHeader
                me={me}
                links={links}
                unread={unreadMessages + unreadAnnouncements}
                search={search}
                onSearch={(v) => {
                    setSearch(v);
                    if (!isChat) changeSection('messages');
                }}
                onOpenSidebar={() => setSidebarOpen(true)}
                onBell={() => changeSection(unreadAnnouncements > 0 ? 'announcements' : 'messages')}
            />

            <div className="flex min-h-0 flex-1">
                <ConnectSidebar
                    section={section}
                    onSection={changeSection}
                    unreadMessages={unreadMessages}
                    unreadAnnouncements={unreadAnnouncements}
                    groups={groups}
                    onOpenConversation={(id) => {
                        setTab('group');
                        setSection('groups');
                        openConversation(id);
                    }}
                    links={links}
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="flex min-h-0 min-w-0 flex-1 gap-3 p-2 sm:p-3 lg:gap-3 lg:p-3">
                    {isChat && (
                        <>
                            <div className={`min-h-0 w-full shrink-0 lg:block lg:w-[320px] ${active ? 'hidden' : 'block'}`}>
                                <ConversationList
                                    conversations={conversations}
                                    loading={loadingList}
                                    activeId={activeId}
                                    tab={tab}
                                    onTab={changeTab}
                                    search={search}
                                    onSearch={setSearch}
                                    onOpen={openConversation}
                                    onNew={() => changeSection('contacts')}
                                />
                            </div>
                            <div className={`min-h-0 min-w-0 flex-1 lg:block ${active ? 'block' : 'hidden'}`}>
                                <ChatPane
                                    conversation={active}
                                    meId={me.id}
                                    phone={details?.profile?.phone ?? null}
                                    infoOpen={infoOpen}
                                    onToggleInfo={() => setInfoOpen((v) => !v)}
                                    onBack={() => {
                                        setActiveId(null);
                                        window.history.replaceState(null, '', '/connect');
                                    }}
                                    onSent={onSent}
                                    onToggleFavorite={toggleFavorite}
                                    onMarkUnread={markUnread}
                                    onLeave={leave}
                                />
                            </div>
                            {active && infoOpen && (
                                <>
                                    <div className="fixed inset-0 z-40 bg-ink-950/40 xl:hidden" onClick={() => setInfoOpen(false)} />
                                    <div className="fixed inset-y-0 right-0 z-50 w-[340px] max-w-[92vw] p-2 xl:static xl:z-auto xl:w-[330px] xl:shrink-0 xl:p-0">
                                        <InfoPanel
                                            conversation={active}
                                            details={details}
                                            onClose={() => setInfoOpen(false)}
                                            onFocusComposer={() => {
                                                if (window.innerWidth < 1280) setInfoOpen(false);
                                                focusComposer();
                                            }}
                                            onOpenConversation={openConversation}
                                            onShowDocuments={() => changeSection('documents')}
                                            onShowGroups={() => changeSection('groups')}
                                            onLeave={leave}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {section === 'announcements' && (
                        <div className="min-h-0 flex-1">
                            <AnnouncementsSection onRead={loadUnread} />
                        </div>
                    )}
                    {section === 'documents' && (
                        <div className="min-h-0 flex-1">
                            <DocumentsSection onOpenConversation={openConversation} />
                        </div>
                    )}
                    {section === 'contacts' && (
                        <div className="min-h-0 flex-1">
                            <ContactsSection onMessage={messageUser} onNewGroup={() => setShowNewGroup(true)} canCreateGroups={canCreateGroups} />
                        </div>
                    )}
                    {section === 'profile' && (
                        <div className="min-h-0 flex-1">
                            <ProfileSection me={me} links={links} />
                        </div>
                    )}
                </main>
            </div>

            <footer className="hidden h-11 shrink-0 items-center justify-between border-t border-ink-100 bg-white px-8 text-[11px] text-ink-500 lg:flex">
                <span className="flex items-center gap-4">
                    <span className="font-serif text-sm font-bold text-ink-900">EEHT Connect</span>
                    <span className="h-4 w-px bg-ink-200" />
                    Plateforme de communication interne
                </span>
                <span>Élite École Hôtelière et Touristique de Thiès • Excellence • Formation • Avenir</span>
            </footer>

            {showNewGroup && (
                <NewGroupModal
                    onClose={() => setShowNewGroup(false)}
                    onCreated={async (id) => {
                        setShowNewGroup(false);
                        await loadConversations(true);
                        setTab('group');
                        setSection('groups');
                        openConversation(id);
                    }}
                />
            )}
        </div>
    );
}

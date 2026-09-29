import {
    ChevronLeft,
    FileText,
    Image as ImageIcon,
    Info,
    Link2,
    Loader2,
    LogOut,
    MailOpen,
    MessageSquare,
    Mic,
    MoreHorizontal,
    MoreVertical,
    Paperclip,
    Phone,
    Pin,
    Reply,
    Send,
    Smile,
    Sparkles,
    Square,
    Star,
    Undo2,
    Video,
    X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar, { groupIconFor } from './Avatar';
import FileIcon from './FileIcon';
import MessageBubble from './MessageBubble';
import { AiConfig, ChatMessage, ConversationSummary, Person, PinnedMessage } from './types';
import { dayLabel, formatSize } from './utils';

const EMOJIS = ['😀', '😂', '😊', '😍', '🙏', '👍', '👏', '🙌', '👋', '🎉', '🔥', '💯', '✅', '❌', '⚠️', '📌', '📚', '📝', '📅', '⏰', '🍽️', '👨‍🍳', '🏨', '✈️', '❤️', '💪', '🤝', '😅', '🤔', '😢', '😮', '😎'];

const ACCEPT_ALL = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.m4a,.wav,.ogg,.webm';

const REWRITE_MODES: { key: string; label: string }[] = [
    { key: 'corriger', label: 'Corriger les fautes' },
    { key: 'formel', label: 'Plus formel' },
    { key: 'court', label: 'Plus court' },
    { key: 'amical', label: 'Plus chaleureux' },
];

type Summary = { summary: string; key_points: string[]; action_items: string[] };

function apiError(e: unknown, fallback: string): string {
    const response = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
    return Object.values(response?.data?.errors ?? {})[0]?.[0] ?? response?.data?.message ?? fallback;
}

function normalize(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function ChatPane({
    conversation,
    meId,
    onCall,
    members,
    ai,
    focusMessageId,
    infoOpen,
    onToggleInfo,
    onBack,
    onSent,
    onToggleFavorite,
    onMarkUnread,
    onLeave,
}: {
    conversation: ConversationSummary | null;
    meId: number;
    onCall: (type: 'audio' | 'video') => void;
    members: Person[];
    ai: AiConfig;
    focusMessageId: number | null;
    infoOpen: boolean;
    onToggleInfo: () => void;
    onBack: () => void;
    onSent: (message: ChatMessage) => void;
    onToggleFavorite: () => void;
    onMarkUnread: () => void;
    onLeave: () => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [readUpTo, setReadUpTo] = useState(0);
    const [other, setOther] = useState<Person | null>(null);
    const [pinned, setPinned] = useState<PinnedMessage[]>([]);
    const [canWrite, setCanWrite] = useState(true);
    const [canPin, setCanPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightId, setHighlightId] = useState<number | null>(null);

    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [mentioned, setMentioned] = useState<{ id: number; name: string }[]>([]);
    const [mentionQuery, setMentionQuery] = useState<{ start: number; query: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [popover, setPopover] = useState<'emoji' | 'more' | 'menu' | 'ai' | null>(null);
    const [recording, setRecording] = useState<{ recorder: MediaRecorder; started: number } | null>(null);
    const [recordSeconds, setRecordSeconds] = useState(0);

    const [aiBusy, setAiBusy] = useState(false);
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [previousBody, setPreviousBody] = useState<string | null>(null);
    const [summary, setSummary] = useState<Summary | 'loading' | null>(null);
    const [translations, setTranslations] = useState<Record<number, { language: string; text: string | null }>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const photoInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const docInput = useRef<HTMLInputElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const lastIdRef = useRef(0);
    const sinceRef = useRef<string | null>(null);
    const conversationId = conversation?.id ?? null;
    const isGroup = conversation?.type === 'group';

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

    const highlight = (id: number) => {
        requestAnimationFrame(() => {
            document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setHighlightId(id);
            setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2500);
        });
    };

    const applyResponse = (data: {
        others_read_up_to: number;
        other: Person | null;
        pinned: PinnedMessage[];
        can_write: boolean;
        can_pin: boolean;
        server_time: string;
    }) => {
        setReadUpTo(data.others_read_up_to);
        if (data.other) setOther(data.other);
        setPinned(data.pinned);
        setCanWrite(data.can_write);
        setCanPin(data.can_pin);
        sinceRef.current = data.server_time;
    };

    const load = useCallback(
        async (around: number | null) => {
            if (!conversationId) return;
            setLoading(true);
            try {
                const res = await window.axios.get(route('connect.messages', conversationId), { params: around ? { around } : {} });
                setMessages(res.data.messages);
                setHasMore(res.data.has_more);
                applyResponse(res.data);
                lastIdRef.current = res.data.messages.at(-1)?.id ?? 0;
                stickToBottom.current = !around;
                if (around) highlight(around);
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [conversationId],
    );

    // Changement de conversation.
    useEffect(() => {
        setMessages([]);
        setOther(conversation?.other ?? null);
        setPinned([]);
        setBody('');
        setAttachment(null);
        setReplyTo(null);
        setMentioned([]);
        setError(null);
        setPopover(null);
        setSuggestions(null);
        setPreviousBody(null);
        setSummary(null);
        setTranslations({});
        lastIdRef.current = 0;
        sinceRef.current = null;
        load(focusMessageId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    const jumpTo = useCallback(
        (id: number) => {
            if (messages.some((m) => m.id === id)) highlight(id);
            else load(id);
        },
        [messages, load],
    );

    // Saut demandé de l'extérieur (résultat de recherche, épingle) dans la conversation déjà ouverte.
    useEffect(() => {
        if (focusMessageId && messages.length > 0) jumpTo(focusMessageId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusMessageId]);

    // Nouveaux messages, réactions et accusés de lecture, toutes les 3 secondes.
    useEffect(() => {
        if (!conversationId) return;
        const id = setInterval(async () => {
            if (!sinceRef.current) return;
            try {
                const res = await window.axios.get(route('connect.messages', conversationId), {
                    params: { after: lastIdRef.current || undefined, since: sinceRef.current },
                });
                applyResponse(res.data);
                const changed: ChatMessage[] = res.data.changed ?? [];
                const fresh: ChatMessage[] = lastIdRef.current ? res.data.messages : [];
                if (!lastIdRef.current && res.data.messages.length) {
                    // Conversation vide jusqu'ici : on prend ce qui est arrivé.
                    fresh.push(...res.data.messages);
                }
                if (fresh.length > 0) {
                    const el = scrollRef.current;
                    stickToBottom.current = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                    lastIdRef.current = fresh.at(-1)!.id;
                }
                if (fresh.length > 0 || changed.length > 0) {
                    setMessages((prev) => {
                        const byId = new Map(changed.map((m) => [m.id, m]));
                        const known = new Set(prev.map((m) => m.id));
                        return [...prev.map((m) => byId.get(m.id) ?? m), ...fresh.filter((m) => !known.has(m.id))];
                    });
                }
            } catch {
                // Erreur réseau passagère : le prochain passage réessaiera.
            }
        }, 3000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    useLayoutEffect(() => {
        if (stickToBottom.current) scrollToBottom();
    }, [messages]);

    const replaceMessage = (m: ChatMessage) => setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));

    const loadOlder = async () => {
        if (!conversationId || messages.length === 0) return;
        const el = scrollRef.current;
        const previousHeight = el?.scrollHeight ?? 0;
        const res = await window.axios.get(route('connect.messages', conversationId), { params: { before: messages[0].id } });
        stickToBottom.current = false;
        setMessages((prev) => [...res.data.messages, ...prev]);
        setHasMore(res.data.has_more);
        requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - previousHeight;
        });
    };

    const send = useCallback(
        async (file?: File | null) => {
            const toSend = file ?? attachment;
            if (!conversationId || (!body.trim() && !toSend)) return;
            setSending(true);
            setError(null);
            try {
                const form = new FormData();
                if (body.trim()) form.append('body', body.trim());
                if (toSend) form.append('attachment', toSend);
                if (replyTo) form.append('reply_to_id', String(replyTo.id));
                mentioned.filter((m) => body.includes(`@${m.name}`)).forEach((m) => form.append('mention_ids[]', String(m.id)));
                const res = await window.axios.post(route('connect.send', conversationId), form);
                stickToBottom.current = true;
                setMessages((prev) => (prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]));
                lastIdRef.current = Math.max(lastIdRef.current, res.data.message.id);
                onSent(res.data.message);
                setBody('');
                setAttachment(null);
                setReplyTo(null);
                setMentioned([]);
                setSuggestions(null);
                setPreviousBody(null);
                [photoInput, fileInput, docInput].forEach((r) => r.current && (r.current.value = ''));
            } catch (e) {
                setError(apiError(e, "Le message n'a pas pu être envoyé."));
            } finally {
                setSending(false);
            }
        },
        [attachment, body, conversationId, mentioned, onSent, replyTo],
    );

    const react = async (message: ChatMessage, emoji: string) => {
        const res = await window.axios.post(route('connect.react', message.id), { emoji });
        replaceMessage(res.data.message);
    };

    const togglePin = async (message: ChatMessage) => {
        try {
            const res = await window.axios.post(route('connect.pin', message.id));
            const m: ChatMessage = res.data.message;
            replaceMessage(m);
            setPinned((prev) =>
                m.pinned
                    ? [{ id: m.id, sender_name: m.sender_name ?? '', body: m.body ?? `📎 ${m.attachment?.name ?? ''}` }, ...prev]
                    : prev.filter((p) => p.id !== m.id),
            );
        } catch (e) {
            setError(apiError(e, "Impossible d'épingler ce message."));
        }
    };

    // --- Saisie : @mentions -------------------------------------------------

    const onBodyChange = (value: string, caret: number) => {
        setBody(value);
        if (!isGroup) return;
        const match = value.slice(0, caret).match(/(^|\s)@([^\s@]{0,20})$/);
        setMentionQuery(match ? { start: caret - match[2].length - 1, query: match[2] } : null);
    };

    const mentionCandidates = mentionQuery
        ? members.filter((m) => m.id !== meId && normalize(m.name).includes(normalize(mentionQuery.query))).slice(0, 6)
        : [];

    const pickMention = (person: Person) => {
        if (!mentionQuery) return;
        const el = textarea.current;
        const caret = el?.selectionStart ?? body.length;
        setBody(`${body.slice(0, mentionQuery.start)}@${person.name} ${body.slice(caret)}`);
        setMentioned((prev) => (prev.some((m) => m.id === person.id) ? prev : [...prev, { id: person.id, name: person.name }]));
        const pos = mentionQuery.start + person.name.length + 2;
        setMentionQuery(null);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(pos, pos);
        });
    };

    const insertAtCursor = (text: string) => {
        const el = textarea.current;
        if (!el) return setBody((b) => b + text);
        const start = el.selectionStart ?? body.length;
        const end = el.selectionEnd ?? body.length;
        setBody(body.slice(0, start) + text + body.slice(end));
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + text.length, start + text.length);
        });
    };

    const addLink = () => {
        setPopover(null);
        const url = window.prompt('Adresse du lien à partager :', 'https://');
        if (url && url !== 'https://') insertAtCursor(`${body && !body.endsWith(' ') ? ' ' : ''}${url} `);
    };

    // --- Assistant IA --------------------------------------------------------

    const runAi = async (task: () => Promise<void>) => {
        setPopover(null);
        setAiBusy(true);
        setError(null);
        try {
            await task();
        } catch (e) {
            setError(apiError(e, "L'assistant n'a pas pu répondre."));
        } finally {
            setAiBusy(false);
        }
    };

    const suggest = () =>
        runAi(async () => {
            const res = await window.axios.post(route('connect.ai.suggest', conversationId!));
            setSuggestions(res.data.suggestions);
        });

    const rewrite = (mode: string) =>
        runAi(async () => {
            const res = await window.axios.post(route('connect.ai.rewrite'), { text: body, mode });
            setPreviousBody(body);
            setBody(res.data.text);
        });

    const translateDraft = (language: string) =>
        runAi(async () => {
            const res = await window.axios.post(route('connect.ai.translate'), { text: body, language });
            setPreviousBody(body);
            setBody(res.data.text);
        });

    const translateMessage = async (message: ChatMessage, language: string) => {
        setTranslations((t) => ({ ...t, [message.id]: { language, text: null } }));
        try {
            const res = await window.axios.post(route('connect.ai.translate'), { message_id: message.id, language });
            setTranslations((t) => ({ ...t, [message.id]: { language, text: res.data.text } }));
        } catch (e) {
            setTranslations((t) => ({ ...t, [message.id]: { language, text: apiError(e, 'Traduction indisponible.') } }));
        }
    };

    const summarize = async () => {
        setPopover(null);
        setSummary('loading');
        try {
            const res = await window.axios.post(route('connect.ai.summarize', conversationId!));
            setSummary(res.data);
        } catch (e) {
            setSummary(null);
            setError(apiError(e, "Le résumé n'a pas pu être généré."));
        }
    };

    // --- Notes vocales -------------------------------------------------------

    const startRecording = async () => {
        setPopover(null);
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setError("L'enregistrement audio n'est pas pris en charge par ce navigateur.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const type = recorder.mimeType || 'audio/webm';
                const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
                if (chunks.length) send(new File(chunks, `note-vocale-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`, { type }));
            };
            recorder.start();
            setRecording({ recorder, started: Date.now() });
            setRecordSeconds(0);
        } catch {
            setError('Accès au micro refusé. Autorisez le micro dans votre navigateur pour envoyer une note vocale.');
        }
    };

    useEffect(() => {
        if (!recording) return;
        const id = setInterval(() => setRecordSeconds(Math.floor((Date.now() - recording.started) / 1000)), 500);
        return () => clearInterval(id);
    }, [recording]);

    const stopRecording = (keep: boolean) => {
        if (!recording) return;
        if (!keep) recording.recorder.ondataavailable = null;
        recording.recorder.stop();
        setRecording(null);
    };

    if (!conversation) {
        return (
            <section className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white text-ink-300 shadow-sm">
                <MessageSquare className="h-12 w-12" />
                <p className="text-sm text-ink-500">Sélectionnez une conversation pour l'afficher.</p>
            </section>
        );
    }

    const isAssistant = conversation.type === 'assistant';
    const subtitle = isAssistant
        ? 'Rappels et alertes automatiques'
        : isGroup
          ? `${conversation.members_count} membres`
          : (other?.subtitle ?? other?.role);
    const toolButton = 'flex h-10 w-10 items-center justify-center rounded-full border border-ink-100 text-ink-800 transition-colors hover:bg-ink-50';
    const menuItem = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50';

    const toolbar = [
        { label: 'Photo', icon: ImageIcon, onClick: () => photoInput.current?.click() },
        { label: 'Fichier', icon: Paperclip, onClick: () => fileInput.current?.click() },
        { label: 'Document', icon: FileText, onClick: () => docInput.current?.click() },
        { label: 'Lien', icon: Link2, onClick: addLink },
        { label: 'Audio', icon: Mic, onClick: startRecording },
        { label: 'Plus', icon: MoreHorizontal, onClick: () => setPopover(popover === 'more' ? null : 'more') },
    ];

    return (
        <section className="relative flex h-full min-h-0 flex-col rounded-2xl border border-ink-100 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-ink-100 px-3 py-3 sm:px-5">
                <button onClick={onBack} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50 lg:hidden" aria-label="Retour">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={onToggleInfo} className="flex min-w-0 items-center gap-3 text-left">
                    <Avatar
                        name={conversation.name}
                        src={conversation.avatar}
                        size="md"
                        group={conversation.type !== 'direct'}
                        groupIcon={groupIconFor(conversation.name, conversation.is_class, conversation.type)}
                    />
                    <span className="min-w-0">
                        <span className="block truncate font-serif text-base font-bold text-ink-900">{conversation.name}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-500">
                            {conversation.type === 'direct' && other && (
                                <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap ${other.online ? 'text-ink-700' : ''}`}>
                                    <span className={`h-2 w-2 rounded-full ${other.online ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                                    {other.online ? 'En ligne' : 'Hors ligne'}
                                </span>
                            )}
                            {subtitle && <span className="truncate sm:ml-4">{subtitle}</span>}
                        </span>
                    </span>
                </button>

                <div className="ml-auto flex items-center gap-2">
                    {conversation.type === 'direct' && (
                        <>
                            <button onClick={() => onCall('audio')} className={toolButton} aria-label="Appel vocal" title="Appel vocal">
                                <Phone className="h-4 w-4" />
                            </button>
                            <button onClick={() => onCall('video')} className={toolButton} aria-label="Appel vidéo" title="Appel vidéo">
                                <Video className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <div className="relative">
                        <button onClick={() => setPopover(popover === 'menu' ? null : 'menu')} className={toolButton} aria-label="Plus d'options">
                            <MoreVertical className="h-4 w-4" />
                        </button>
                        {popover === 'menu' && (
                            <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                                {ai.enabled && !isAssistant && (
                                    <button onClick={summarize} className={menuItem}>
                                        <Sparkles className="h-4 w-4 text-gold-600" /> Résumer la conversation
                                    </button>
                                )}
                                <button onClick={() => { setPopover(null); onToggleInfo(); }} className={menuItem}>
                                    <Info className="h-4 w-4" /> {infoOpen ? 'Masquer les informations' : 'Afficher les informations'}
                                </button>
                                <button onClick={() => { setPopover(null); onMarkUnread(); }} className={menuItem}>
                                    <MailOpen className="h-4 w-4" /> Marquer comme non lu
                                </button>
                                {isGroup && !conversation.is_class && (
                                    <button onClick={() => { setPopover(null); onLeave(); }} className={`${menuItem} !text-red-600 hover:!bg-red-50`}>
                                        <LogOut className="h-4 w-4" /> Quitter le groupe
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={onToggleFavorite} className={toolButton} aria-label={conversation.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                        <Star className={`h-4 w-4 ${conversation.is_favorite ? 'fill-gold-500 text-gold-500' : ''}`} />
                    </button>
                </div>
            </header>

            {pinned.length > 0 && (
                <button onClick={() => jumpTo(pinned[0].id)} className="flex items-center gap-3 border-b border-ink-100 bg-gold-50/60 px-5 py-2 text-left hover:bg-gold-50">
                    <Pin className="h-4 w-4 shrink-0 text-gold-700" />
                    <span className="min-w-0 text-xs">
                        <span className="font-semibold text-ink-900">
                            Épinglé{pinned.length > 1 ? ` (${pinned.length})` : ''} · {pinned[0].sender_name}
                        </span>
                        <span className="block truncate text-ink-600">{pinned[0].body}</span>
                    </span>
                </button>
            )}

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5 pt-10 sm:px-6">
                {loading && <p className="text-center text-sm text-ink-400">Chargement…</p>}
                {hasMore && !loading && (
                    <div className="text-center">
                        <button onClick={loadOlder} className="rounded-full border border-ink-100 px-4 py-1.5 text-xs text-ink-600 hover:bg-ink-50">
                            Afficher les messages précédents
                        </button>
                    </div>
                )}
                {!loading && messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-ink-400">
                        {isAssistant ? 'Aucun rappel pour le moment.' : "Aucun message pour l'instant. Écrivez le premier !"}
                    </p>
                )}
                {messages.map((m, i) => {
                    const showDay = i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
                    return (
                        <Fragment key={m.id}>
                            {showDay && (
                                <div className="flex justify-center">
                                    <span className="rounded-full bg-[#eef2f8] px-4 py-1.5 text-[11px] font-medium text-ink-700">{dayLabel(m.created_at)}</span>
                                </div>
                            )}
                            <MessageBubble
                                message={m}
                                mine={m.user_id === meId}
                                readUpTo={readUpTo}
                                isGroup={isGroup}
                                highlighted={highlightId === m.id}
                                canPin={canPin}
                                aiEnabled={ai.enabled}
                                languages={ai.languages}
                                translation={translations[m.id]}
                                onReply={() => {
                                    setReplyTo(m);
                                    textarea.current?.focus();
                                }}
                                onReact={(emoji) => react(m, emoji)}
                                onPin={() => togglePin(m)}
                                onTranslate={(language) => translateMessage(m, language)}
                                onJump={jumpTo}
                            />
                        </Fragment>
                    );
                })}
            </div>

            {summary && (
                <div className="absolute inset-x-3 top-20 z-30 max-h-[70%] overflow-y-auto rounded-2xl border border-gold-200 bg-white p-5 shadow-elevated sm:inset-x-8">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="flex items-center gap-2 font-serif text-base font-bold text-ink-900">
                            <Sparkles className="h-4 w-4 text-gold-600" /> Résumé de la conversation
                        </p>
                        <button onClick={() => setSummary(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-50" aria-label="Fermer">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {summary === 'loading' ? (
                        <p className="flex items-center gap-2 text-sm text-ink-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Analyse de la conversation…
                        </p>
                    ) : (
                        <div className="space-y-3 text-[13px] text-ink-700">
                            <p className="leading-relaxed">{summary.summary}</p>
                            {summary.key_points.length > 0 && (
                                <div>
                                    <p className="mb-1 font-semibold text-ink-900">Points clés</p>
                                    <ul className="list-disc space-y-0.5 pl-5">
                                        {summary.key_points.map((p, i) => (
                                            <li key={i}>{p}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {summary.action_items.length > 0 && (
                                <div>
                                    <p className="mb-1 font-semibold text-ink-900">À faire</p>
                                    <ul className="space-y-0.5">
                                        {summary.action_items.map((p, i) => (
                                            <li key={i}>☐ {p}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <p className="text-[11px] text-ink-400">Généré par l'assistant IA — vérifiez les informations importantes.</p>
                        </div>
                    )}
                </div>
            )}

            {!canWrite ? (
                <div className="border-t border-ink-100 px-5 py-4 text-center text-xs text-ink-500">
                    <Sparkles className="mr-1 inline h-3.5 w-3.5 text-gold-600" />
                    Cette conversation reçoit vos rappels automatiques : examens, devoirs, emploi du temps et absences.
                </div>
            ) : (
                <div className="border-t border-ink-100 px-3 pb-3 pt-3 sm:px-5">
                    {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

                    {suggestions && suggestions.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4 text-gold-600" />
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setBody(s);
                                        setSuggestions(null);
                                        textarea.current?.focus();
                                    }}
                                    className="rounded-full border border-gold-300 bg-gold-50 px-3 py-1.5 text-left text-xs text-ink-800 hover:bg-gold-100"
                                >
                                    {s}
                                </button>
                            ))}
                            <button onClick={() => setSuggestions(null)} className="text-ink-400 hover:text-ink-700" aria-label="Masquer les suggestions">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    {previousBody !== null && (
                        <button
                            onClick={() => {
                                setBody(previousBody);
                                setPreviousBody(null);
                            }}
                            className="mb-2 inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline"
                        >
                            <Undo2 className="h-3.5 w-3.5" /> Revenir au texte d'origine
                        </button>
                    )}

                    {replyTo && (
                        <div className="mb-2 flex items-center gap-3 rounded-lg border-l-4 border-ink-900 bg-ink-50 px-3 py-2 text-xs">
                            <Reply className="h-4 w-4 shrink-0 text-ink-500" />
                            <span className="min-w-0 flex-1">
                                <span className="font-semibold text-ink-900">Réponse à {replyTo.user_id === meId ? 'vous-même' : replyTo.sender_name}</span>
                                <span className="block truncate text-ink-600">{replyTo.body ?? `📎 ${replyTo.attachment?.name ?? ''}`}</span>
                            </span>
                            <button onClick={() => setReplyTo(null)} className="text-ink-400 hover:text-ink-700" aria-label="Annuler la réponse">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {attachment && (
                        <div className="mb-2 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700">
                            <FileIcon name={attachment.name} mime={attachment.type} size="sm" />
                            <span className="truncate">{attachment.name}</span>
                            <span className="shrink-0 text-ink-400">{formatSize(attachment.size)}</span>
                            <button
                                onClick={() => {
                                    setAttachment(null);
                                    [photoInput, fileInput, docInput].forEach((r) => r.current && (r.current.value = ''));
                                }}
                                className="ml-auto text-ink-400 hover:text-ink-700"
                                aria-label="Retirer la pièce jointe"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                    <input ref={fileInput} type="file" accept={ACCEPT_ALL} className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                    <input ref={docInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />

                    {recording ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                            <span className="text-sm font-medium text-red-700">
                                Enregistrement… {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
                            </span>
                            <button onClick={() => stopRecording(false)} className="ml-auto text-xs font-medium text-ink-600 hover:text-ink-900">
                                Annuler
                            </button>
                            <button onClick={() => stopRecording(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white" aria-label="Arrêter et envoyer">
                                <Square className="h-4 w-4 fill-white" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center gap-1 rounded-2xl border border-ink-200 px-2 py-2 focus-within:border-gold-500 sm:gap-2 sm:px-3">
                            {mentionCandidates.length > 0 && (
                                <div className="absolute bottom-full left-10 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Mentionner</p>
                                    {mentionCandidates.map((p) => (
                                        <button
                                            key={p.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                pickMention(p);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-ink-50"
                                        >
                                            <Avatar name={p.name} src={p.avatar} size="xs" />
                                            <span className="min-w-0 leading-tight">
                                                <span className="block truncate text-[13px] text-ink-900">{p.name}</span>
                                                <span className="block truncate text-[10px] text-ink-500">{p.role}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button onClick={() => fileInput.current?.click()} className="rounded-full p-2 text-ink-700 hover:bg-ink-50" aria-label="Joindre un fichier">
                                <Paperclip className="h-5 w-5" />
                            </button>
                            <div className="relative">
                                <button onClick={() => setPopover(popover === 'emoji' ? null : 'emoji')} className="rounded-full p-2 text-ink-700 hover:bg-ink-50" aria-label="Emoji">
                                    <Smile className="h-5 w-5" />
                                </button>
                                {popover === 'emoji' && (
                                    <div className="absolute bottom-12 left-0 z-20 grid w-72 grid-cols-8 gap-1 rounded-xl border border-ink-100 bg-white p-2 shadow-elevated">
                                        {EMOJIS.map((e) => (
                                            <button key={e} onClick={() => insertAtCursor(e)} className="rounded-md p-1 text-xl hover:bg-ink-50">
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => photoInput.current?.click()} className="hidden rounded-full p-2 text-ink-700 hover:bg-ink-50 sm:block" aria-label="Envoyer une photo">
                                <ImageIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => docInput.current?.click()} className="hidden rounded-full p-2 text-ink-700 hover:bg-ink-50 sm:block" aria-label="Envoyer un document">
                                <FileText className="h-5 w-5" />
                            </button>
                            {ai.enabled && (
                                <div className="relative">
                                    <button
                                        onClick={() => setPopover(popover === 'ai' ? null : 'ai')}
                                        disabled={aiBusy}
                                        className="rounded-full p-2 text-gold-600 hover:bg-gold-50 disabled:opacity-60"
                                        aria-label="Assistant IA"
                                        title="Assistant IA"
                                    >
                                        {aiBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                                    </button>
                                    {popover === 'ai' && (
                                        <div className="absolute bottom-12 left-0 z-20 w-64 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                                            <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Assistant IA</p>
                                            <button onClick={suggest} className={menuItem}>
                                                💡 Suggérer des réponses
                                            </button>
                                            {body.trim() ? (
                                                <>
                                                    {REWRITE_MODES.map((m) => (
                                                        <button key={m.key} onClick={() => rewrite(m.key)} className={menuItem}>
                                                            ✍️ {m.label}
                                                        </button>
                                                    ))}
                                                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Traduire mon message</p>
                                                    <div className="flex flex-wrap gap-1 px-3 pb-2">
                                                        {Object.entries(ai.languages).map(([code, label]) => (
                                                            <button key={code} onClick={() => translateDraft(code)} className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-700 hover:bg-ink-100">
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="px-4 pb-2 text-[11px] text-ink-400">Écrivez un message pour le corriger, le reformuler ou le traduire.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <textarea
                                ref={textarea}
                                id="connect-composer"
                                value={body}
                                onChange={(e) => onBodyChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                                onKeyDown={(e) => {
                                    if (mentionCandidates.length > 0 && (e.key === 'Enter' || e.key === 'Tab')) {
                                        e.preventDefault();
                                        pickMention(mentionCandidates[0]);
                                        return;
                                    }
                                    if (e.key === 'Escape') setMentionQuery(null);
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                rows={1}
                                placeholder="Écrire un message..."
                                title={isGroup ? 'Tapez @ pour mentionner un membre du groupe' : undefined}
                                className="max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm placeholder:text-ink-400 focus:outline-none focus:ring-0"
                            />
                            <button
                                onClick={() => send()}
                                disabled={sending || (!body.trim() && !attachment)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Envoyer"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    <div className="relative mt-3 hidden items-center gap-2 sm:flex">
                        {toolbar.map((t) => (
                            <button key={t.label} onClick={t.onClick} className="flex w-16 flex-col items-center gap-1.5 rounded-lg py-1 text-[11px] text-ink-700 hover:bg-ink-50">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-100">
                                    <t.icon className="h-4 w-4" />
                                </span>
                                {t.label}
                            </button>
                        ))}
                        {popover === 'more' && (
                            <div className="absolute bottom-16 left-80 z-20 w-60 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                                {ai.enabled && (
                                    <>
                                        <button onClick={suggest} className={menuItem}>
                                            <Sparkles className="h-4 w-4 text-gold-600" /> Suggérer des réponses
                                        </button>
                                        <button onClick={summarize} className={menuItem}>
                                            <Sparkles className="h-4 w-4 text-gold-600" /> Résumer la conversation
                                        </button>
                                    </>
                                )}
                                <button onClick={() => { setPopover(null); onToggleInfo(); }} className={menuItem}>
                                    <Info className="h-4 w-4" /> Infos de la conversation
                                </button>
                                <button onClick={() => setPopover('emoji')} className={menuItem}>
                                    <Smile className="h-4 w-4" /> Emojis
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

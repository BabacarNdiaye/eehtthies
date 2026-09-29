import {
    Check,
    CheckCheck,
    ChevronLeft,
    Download,
    EllipsisVertical,
    FileText,
    Image as ImageIcon,
    Info,
    Link2,
    LogOut,
    MailOpen,
    MessageSquare,
    MoreHorizontal,
    MoreVertical,
    Mic,
    Paperclip,
    Phone,
    Send,
    Smile,
    Square,
    Star,
    Video,
    X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Avatar, { groupIconFor } from './Avatar';
import FileIcon from './FileIcon';
import { ChatMessage, ConversationSummary, Person } from './types';
import { clockTime, dayLabel, extension, fileKind, formatSize, linkify } from './utils';

const EMOJIS = ['😀', '😂', '😊', '😍', '🙏', '👍', '👏', '🙌', '👋', '🎉', '🔥', '💯', '✅', '❌', '⚠️', '📌', '📚', '📝', '📅', '⏰', '🍽️', '👨‍🍳', '🏨', '✈️', '❤️', '💪', '🤝', '😅', '🤔', '😢', '😮', '😎'];

const ACCEPT_ALL = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.m4a,.wav,.ogg,.webm';

function Bubble({ message, mine, readUpTo, isGroup }: { message: ChatMessage; mine: boolean; readUpTo: number; isGroup: boolean }) {
    const kind = message.attachment ? fileKind(message.attachment.name, message.attachment.mime) : null;
    const hasText = !!(message.subject || message.body);

    return (
        <div className={`flex items-end gap-3 ${mine ? 'justify-end' : 'justify-start'}`}>
            {!mine && <Avatar name={message.sender_name ?? '?'} src={message.sender_avatar} size="sm" />}
            <div className={`flex max-w-[78%] flex-col gap-2 sm:max-w-[65%] ${mine ? 'items-end' : 'items-start'}`}>
                {hasText && (
                    <div
                        className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                            mine ? 'rounded-br-md bg-ink-900 text-white' : 'rounded-bl-md bg-[#eef2f8] text-ink-800'
                        }`}
                    >
                        {!mine && isGroup && <p className="mb-1 text-[11px] font-semibold text-gold-700">{message.sender_name}</p>}
                        {message.subject && <p className="mb-1 font-semibold">{message.subject}</p>}
                        {message.body && (
                            <p className="whitespace-pre-line break-words">
                                {linkify(message.body).map((part, i) =>
                                    part.href ? (
                                        <a key={i} href={part.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                            {part.text}
                                        </a>
                                    ) : (
                                        <Fragment key={i}>{part.text}</Fragment>
                                    ),
                                )}
                            </p>
                        )}
                        <p className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-white/70' : 'text-ink-400'}`}>
                            {clockTime(message.created_at)}
                            {mine && (message.id <= readUpTo ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : <Check className="h-3.5 w-3.5" />)}
                        </p>
                    </div>
                )}

                {message.attachment && kind === 'image' && (
                    <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-ink-100 shadow-sm">
                        <img src={message.attachment.url} alt={message.attachment.name} className="max-h-72 max-w-full object-cover" loading="lazy" />
                    </a>
                )}

                {message.attachment && kind === 'audio' && (
                    <div className={`rounded-2xl px-3 py-2 shadow-sm ${mine ? 'bg-ink-900' : 'bg-[#eef2f8]'}`}>
                        <audio controls preload="none" src={message.attachment.url} className="h-9 w-60" />
                    </div>
                )}

                {message.attachment && kind !== 'image' && kind !== 'audio' && (
                    <div className="flex w-72 max-w-full items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
                        <FileIcon name={message.attachment.name} mime={message.attachment.mime} />
                        <a href={message.attachment.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-ink-900">{message.attachment.name}</p>
                            <p className="text-[11px] text-ink-500">
                                {formatSize(message.attachment.size)} • {extension(message.attachment.name)}
                            </p>
                        </a>
                        <a href={`${message.attachment.url}?download=1`} className="rounded-md p-1 text-ink-600 hover:bg-ink-50" aria-label="Télécharger">
                            <Download className="h-4 w-4" />
                        </a>
                        <EllipsisVertical className="h-4 w-4 text-ink-400" />
                    </div>
                )}

                {!hasText && (
                    <p className="flex items-center gap-1.5 px-1 text-[10px] text-ink-400">
                        {clockTime(message.created_at)}
                        {mine && (message.id <= readUpTo ? <CheckCheck className="h-3.5 w-3.5 text-sky-500" /> : <Check className="h-3.5 w-3.5" />)}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function ChatPane({
    conversation,
    meId,
    phone,
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
    phone: string | null;
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
    const [loading, setLoading] = useState(false);
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [popover, setPopover] = useState<'emoji' | 'more' | 'menu' | null>(null);
    const [recording, setRecording] = useState<{ recorder: MediaRecorder; started: number } | null>(null);
    const [recordSeconds, setRecordSeconds] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const photoInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const docInput = useRef<HTMLInputElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const lastIdRef = useRef(0);
    const conversationId = conversation?.id ?? null;

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

    // Chargement initial de la conversation.
    useEffect(() => {
        setMessages([]);
        setOther(conversation?.other ?? null);
        setBody('');
        setAttachment(null);
        setError(null);
        setPopover(null);
        lastIdRef.current = 0;
        if (!conversationId) return;

        let cancelled = false;
        setLoading(true);
        window.axios
            .get(route('connect.messages', conversationId))
            .then((res) => {
                if (cancelled) return;
                setMessages(res.data.messages);
                setHasMore(res.data.has_more);
                setReadUpTo(res.data.others_read_up_to);
                if (res.data.other) setOther(res.data.other);
                lastIdRef.current = res.data.messages.at(-1)?.id ?? 0;
                stickToBottom.current = true;
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    // Nouveaux messages et accusés de lecture, toutes les 3 secondes.
    useEffect(() => {
        if (!conversationId) return;
        const id = setInterval(async () => {
            try {
                const res = await window.axios.get(route('connect.messages', conversationId), { params: { after: lastIdRef.current } });
                setReadUpTo(res.data.others_read_up_to);
                if (res.data.other) setOther(res.data.other);
                if (res.data.messages.length > 0) {
                    const el = scrollRef.current;
                    stickToBottom.current = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                    setMessages((prev) => {
                        const known = new Set(prev.map((m) => m.id));
                        return [...prev, ...res.data.messages.filter((m: ChatMessage) => !known.has(m.id))];
                    });
                    lastIdRef.current = res.data.messages.at(-1).id;
                }
            } catch {
                // Erreur réseau passagère : le prochain passage réessaiera.
            }
        }, 3000);
        return () => clearInterval(id);
    }, [conversationId]);

    useLayoutEffect(() => {
        if (stickToBottom.current) scrollToBottom();
    }, [messages]);

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
                const res = await window.axios.post(route('connect.send', conversationId), form);
                stickToBottom.current = true;
                setMessages((prev) => (prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]));
                lastIdRef.current = Math.max(lastIdRef.current, res.data.message.id);
                onSent(res.data.message);
                setBody('');
                setAttachment(null);
                [photoInput, fileInput, docInput].forEach((r) => r.current && (r.current.value = ''));
            } catch (e: unknown) {
                const response = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
                setError(Object.values(response?.data?.errors ?? {})[0]?.[0] ?? response?.data?.message ?? "Le message n'a pas pu être envoyé.");
            } finally {
                setSending(false);
            }
        },
        [attachment, body, conversationId, onSent],
    );

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
            setError("Accès au micro refusé. Autorisez le micro dans votre navigateur pour envoyer une note vocale.");
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

    const isGroup = conversation.type === 'group';
    const subtitle = isGroup ? `${conversation.members_count} membres` : other?.subtitle ?? other?.role;
    const toolButton = 'flex h-10 w-10 items-center justify-center rounded-full border border-ink-100 text-ink-800 transition-colors hover:bg-ink-50';

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
                    <Avatar name={conversation.name} src={conversation.avatar} size="md" group={isGroup} groupIcon={groupIconFor(conversation.name, conversation.is_class)} />
                    <span className="min-w-0">
                        <span className="block truncate font-serif text-base font-bold text-ink-900">{conversation.name}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-500">
                            {!isGroup && other && (
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
                    {!isGroup &&
                        (phone ? (
                            <a href={`tel:${phone}`} className={toolButton} aria-label="Appeler" title={`Appeler ${phone}`}>
                                <Phone className="h-4 w-4" />
                            </a>
                        ) : (
                            <button disabled className={`${toolButton} cursor-not-allowed opacity-40`} title="Aucun numéro professionnel renseigné">
                                <Phone className="h-4 w-4" />
                            </button>
                        ))}
                    <button disabled className={`${toolButton} hidden cursor-not-allowed opacity-40 sm:flex`} title="Appel vidéo : bientôt disponible">
                        <Video className="h-4 w-4" />
                    </button>
                    <div className="relative">
                        <button onClick={() => setPopover(popover === 'menu' ? null : 'menu')} className={toolButton} aria-label="Plus d'options">
                            <MoreVertical className="h-4 w-4" />
                        </button>
                        {popover === 'menu' && (
                            <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                                <button onClick={() => { setPopover(null); onToggleInfo(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                                    <Info className="h-4 w-4" /> {infoOpen ? 'Masquer les informations' : 'Afficher les informations'}
                                </button>
                                <button onClick={() => { setPopover(null); onMarkUnread(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                                    <MailOpen className="h-4 w-4" /> Marquer comme non lu
                                </button>
                                {isGroup && !conversation.is_class && (
                                    <button onClick={() => { setPopover(null); onLeave(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
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

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
                {loading && <p className="text-center text-sm text-ink-400">Chargement…</p>}
                {hasMore && !loading && (
                    <div className="text-center">
                        <button onClick={loadOlder} className="rounded-full border border-ink-100 px-4 py-1.5 text-xs text-ink-600 hover:bg-ink-50">
                            Afficher les messages précédents
                        </button>
                    </div>
                )}
                {!loading && messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-ink-400">Aucun message pour l'instant. Écrivez le premier !</p>
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
                            <Bubble message={m} mine={m.user_id === meId} readUpTo={readUpTo} isGroup={isGroup} />
                        </Fragment>
                    );
                })}
            </div>

            <div className="border-t border-ink-100 px-3 pb-3 pt-3 sm:px-5">
                {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
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
                        <textarea
                            ref={textarea}
                            id="connect-composer"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            rows={1}
                            placeholder="Écrire un message..."
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
                        <div className="absolute bottom-16 left-80 z-20 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                            <button onClick={() => { setPopover(null); onToggleInfo(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                                <Info className="h-4 w-4" /> Infos de la conversation
                            </button>
                            <button onClick={() => { setPopover('emoji'); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50">
                                <Smile className="h-4 w-4" /> Emojis
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

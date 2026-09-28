import { usePage } from '@inertiajs/react';
import { ChevronLeft, MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';

interface Message {
    id: number;
    sender_id: number | null;
    subject: string;
    body: string;
    read_at: string | null;
    created_at: string;
    sender: { id: number; name: string } | null;
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_size?: number | null;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AttachmentChip({ message }: { message: Message }) {
    if (!message.attachment_path) return null;

    return (
        <a
            href={`/storage/${message.attachment_path}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-1.5 text-xs hover:bg-black/10"
        >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{message.attachment_name}</span>
            {message.attachment_size != null && <span className="shrink-0 opacity-70">{formatSize(message.attachment_size)}</span>}
        </a>
    );
}

interface ThreadSummary {
    thread_id: number;
    subject: string;
    last_body: string;
    last_at: string;
    other: { id: number; name: string } | null;
    unread_count: number;
}

const avatarPalette = [
    'bg-ink-900',
    'bg-gold-600',
    'bg-brand-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-rose-600',
];

function Avatar({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const colorIndex = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarPalette.length;

    return (
        <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarPalette[colorIndex]}`}
        >
            {initials || '?'}
        </span>
    );
}

/**
 * Full-page messaging inbox (conversation list + thread view with reply box).
 * Shared across the admin panel and every portal. Two-pane on desktop; on
 * mobile it shows one pane at a time (list, then full-screen thread with a
 * back button), matching a phone chat app rather than squeezing both panes
 * side by side.
 */
export default function Inbox() {
    const currentUserId = usePage<PageProps>().props.auth.user?.id;

    const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
    const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
    const [threadMessages, setThreadMessages] = useState<Message[] | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [sending, setSending] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');

    const activeThread = threads?.find((t) => t.thread_id === activeThreadId) ?? null;

    const loadThreads = async (silent = false) => {
        if (!silent) setLoadingList(true);
        try {
            const res = await window.axios.get('/notifications');
            setThreads((prev) => {
                // Don't clobber the unread badge of the thread currently open —
                // it was already marked read locally when opened.
                if (activeThreadId === null) return res.data.threads;
                return res.data.threads.map((t: ThreadSummary) =>
                    t.thread_id === activeThreadId ? { ...t, unread_count: 0 } : t,
                );
            });
        } finally {
            if (!silent) setLoadingList(false);
        }
    };

    useEffect(() => {
        loadThreads();
        const interval = setInterval(() => loadThreads(true), 8000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // While a conversation is open, poll it for new messages so replies show
    // up without needing to close and reopen it.
    useEffect(() => {
        if (!activeThreadId) return;

        const interval = setInterval(async () => {
            const res = await window.axios.get(`/notifications/threads/${activeThreadId}`);
            setThreadMessages(res.data.messages);
        }, 3000);

        return () => clearInterval(interval);
    }, [activeThreadId]);

    const openThread = async (thread: ThreadSummary) => {
        setActiveThreadId(thread.thread_id);
        setThreadMessages(null);
        setReplyBody('');
        setMobileView('thread');
        setLoadingThread(true);
        try {
            const res = await window.axios.get(`/notifications/threads/${thread.thread_id}`);
            setThreadMessages(res.data.messages);
            if (thread.unread_count > 0) {
                setThreads((prev) =>
                    prev?.map((t) => (t.thread_id === thread.thread_id ? { ...t, unread_count: 0 } : t)) ?? null,
                );
            }
        } finally {
            setLoadingThread(false);
        }
    };

    const sendReply = async () => {
        if (!activeThreadId || !replyBody.trim()) return;
        setSending(true);
        try {
            const form = new FormData();
            form.append('body', replyBody);
            if (attachment) form.append('attachment', attachment);

            const res = await window.axios.post(`/notifications/threads/${activeThreadId}/reply`, form);
            setThreadMessages((prev) => [...(prev ?? []), res.data.message]);
            setThreads((prev) =>
                prev?.map((t) =>
                    t.thread_id === activeThreadId
                        ? { ...t, last_body: res.data.message.body, last_at: res.data.message.created_at }
                        : t,
                ) ?? null,
            );
            setReplyBody('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-260px)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div
                className={`w-full shrink-0 flex-col border-ink-100 lg:flex lg:max-w-xs lg:border-r ${
                    mobileView === 'thread' ? 'hidden lg:flex' : 'flex'
                }`}
            >
                <div className="border-b border-ink-100 px-4 py-3">
                    <h2 className="font-serif text-sm font-bold text-ink-900">Conversations</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingList && <p className="px-4 py-6 text-center text-sm text-ink-400">Chargement...</p>}
                    {!loadingList && threads && threads.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-ink-400">Aucun message.</p>
                    )}
                    {!loadingList &&
                        threads?.map((t) => (
                            <button
                                key={t.thread_id}
                                onClick={() => openThread(t)}
                                className={`flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left hover:bg-ink-50 ${
                                    t.thread_id === activeThreadId ? 'bg-ink-50' : ''
                                } ${t.unread_count > 0 ? 'bg-gold-50/50' : ''}`}
                            >
                                <Avatar name={t.other?.name ?? 'Administration'} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-ink-900">
                                            {t.other?.name ?? 'Administration'}
                                        </p>
                                        {t.unread_count > 0 && (
                                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-ink-900">
                                                {t.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-xs font-medium text-ink-600">{t.subject}</p>
                                    <p className="mt-0.5 truncate text-xs text-ink-400">{t.last_body}</p>
                                </div>
                            </button>
                        ))}
                </div>
            </div>

            <div className={`flex-1 flex-col lg:flex ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
                {!activeThread ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink-300">
                        <MessageSquare className="h-10 w-10" />
                        <p className="text-sm">Sélectionnez une conversation pour l'afficher.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-3 sm:px-5">
                            <button
                                onClick={() => setMobileView('list')}
                                className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 lg:hidden"
                                aria-label="Retour aux conversations"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <Avatar name={activeThread.other?.name ?? 'Administration'} />
                            <div className="min-w-0">
                                <p className="truncate font-serif text-sm font-bold text-ink-900">
                                    {activeThread.other?.name ?? 'Administration'}
                                </p>
                                <p className="truncate text-xs text-ink-400">{activeThread.subject}</p>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                            {loadingThread && <p className="text-center text-sm text-ink-400">Chargement...</p>}
                            {!loadingThread &&
                                threadMessages?.map((m) => {
                                    const isMine = m.sender_id === currentUserId;
                                    return (
                                        <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${
                                                    isMine
                                                        ? 'rounded-br-sm bg-ink-900 text-white'
                                                        : 'rounded-bl-sm bg-ink-100 text-ink-800'
                                                }`}
                                            >
                                                <p className="whitespace-pre-line">{m.body}</p>
                                                <AttachmentChip message={m} />
                                                <p className={`mt-1 text-[11px] ${isMine ? 'text-ink-300' : 'text-ink-400'}`}>
                                                    {new Date(m.created_at).toLocaleString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="border-t border-ink-100 p-3 sm:p-4">
                            {attachment && (
                                <div className="mb-2 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-xs text-ink-600">
                                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                    <button
                                        onClick={() => {
                                            setAttachment(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="ml-auto shrink-0 text-ink-400 hover:text-ink-700"
                                        aria-label="Retirer la pièce jointe"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
                                    aria-label="Joindre un fichier"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendReply();
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Répondre..."
                                    className="flex-1 resize-none rounded-full border border-ink-200 px-4 py-2.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                                />
                                <button
                                    onClick={sendReply}
                                    disabled={sending || !replyBody.trim()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Envoyer"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClassMessage {
    id: number;
    body: string;
    created_at: string;
    user_id: number;
    user: { id: number; name: string } | null;
}

const avatarPalette = [
    'bg-ink-900',
    'bg-gold-600',
    'bg-brand-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-rose-600',
];

function avatarColor(name: string) {
    const index = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarPalette.length;
    return avatarPalette[index];
}

function initials(name: string) {
    return name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

interface Props {
    messages: ClassMessage[];
    className: string | null;
}

export default function ClassDiscussion({ messages: initialMessages, className }: Props) {
    const currentUserId = usePage<PageProps>().props.auth.user?.id;
    const [messages, setMessages] = useState(initialMessages);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            const res = await window.axios.get(route('student.class-discussion.messages'));
            setMessages(res.data.messages);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        try {
            const res = await window.axios.post(route('student.class-discussion.store'), { body });
            setMessages((prev) => [...prev, res.data.message]);
            setBody('');
        } finally {
            setSending(false);
        }
    };

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Discussion de classe" />

            <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Users className="h-5 w-5" />
                </span>
                <div>
                    <h1 className="font-serif text-xl font-bold text-ink-900">Discussion de classe</h1>
                    <p className="text-sm text-ink-500">{className ?? 'Ma classe'} — visible par tous vos camarades</p>
                </div>
            </div>

            <div className="flex h-[calc(100vh-320px)] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                    {messages.length === 0 && (
                        <p className="mt-10 text-center text-sm text-ink-400">
                            Aucun message pour le moment — lancez la discussion !
                        </p>
                    )}
                    {messages.map((m) => {
                        const isMine = m.user_id === currentUserId;
                        const name = m.user?.name ?? 'Élève';

                        return (
                            <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                                {!isMine && (
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(name)}`}
                                    >
                                        {initials(name)}
                                    </span>
                                )}
                                <div className={`flex max-w-[75%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                    {!isMine && <span className="mb-0.5 px-1 text-[11px] font-medium text-ink-500">{name}</span>}
                                    <div
                                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                                            isMine
                                                ? 'rounded-br-sm bg-ink-900 text-white'
                                                : 'rounded-bl-sm bg-ink-100 text-ink-800'
                                        }`}
                                    >
                                        <p className="whitespace-pre-line">{m.body}</p>
                                    </div>
                                    <span className="mt-0.5 px-1 text-[11px] text-ink-400">
                                        {new Date(m.created_at).toLocaleString('fr-FR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-end gap-2 border-t border-ink-100 p-3 sm:p-4">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        rows={1}
                        placeholder="Écrire à la classe..."
                        className="flex-1 resize-none rounded-full border border-ink-200 px-4 py-2.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                    <button
                        onClick={send}
                        disabled={sending || !body.trim()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Envoyer"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </PortalLayout>
    );
}

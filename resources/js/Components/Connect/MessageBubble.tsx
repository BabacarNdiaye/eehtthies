import { Ban, BellRing, Check, CheckCheck, Copy, Download, EllipsisVertical, Eye, Languages, Pencil, Pin, PinOff, Reply, SmilePlus, Trash2 } from 'lucide-react';
import { Fragment, ReactNode, useState } from 'react';
import Avatar from './Avatar';
import FileIcon from './FileIcon';
import { ChatMessage } from './types';
import { clockTime, extension, fileKind, formatSize, linkify } from './utils';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '✅', '🎉', '👏'];

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Texte avec liens cliquables et @mentions mises en évidence. */
export function RichText({ text, mentions, mine }: { text: string; mentions: { name: string }[]; mine: boolean }) {
    const names = mentions.map((m) => m.name).filter(Boolean);
    const re = names.length ? new RegExp(`(@(?:${names.map(escapeRegExp).join('|')}))`, 'g') : null;
    const chunks = re ? text.split(re) : [text];

    return (
        <>
            {chunks.map((chunk, i) =>
                re && names.some((n) => chunk === `@${n}`) ? (
                    <span key={i} className={`rounded px-0.5 font-semibold ${mine ? 'bg-white/15 text-gold-300' : 'bg-gold-100 text-gold-800'}`}>
                        {chunk}
                    </span>
                ) : (
                    <Fragment key={i}>
                        {linkify(chunk).map((part, j) =>
                            part.href ? (
                                <a key={j} href={part.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                    {part.text}
                                </a>
                            ) : (
                                <Fragment key={j}>{part.text}</Fragment>
                            ),
                        )}
                    </Fragment>
                ),
            )}
        </>
    );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button onClick={onClick} className="rounded-md p-1.5 text-ink-600 hover:bg-ink-50 hover:text-ink-900" aria-label={label} title={label}>
            {children}
        </button>
    );
}

export default function MessageBubble({
    message,
    mine,
    readUpTo,
    isGroup,
    highlighted,
    canPin,
    aiEnabled,
    languages,
    translation,
    onReply,
    onReact,
    onPin,
    onTranslate,
    onJump,
    onEdit,
    onDelete,
    onOpenImage,
    onShowReaders,
    seenBy,
}: {
    message: ChatMessage;
    mine: boolean;
    readUpTo: number;
    isGroup: boolean;
    highlighted: boolean;
    canPin: boolean;
    aiEnabled: boolean;
    languages: Record<string, string>;
    translation?: { language: string; text: string | null };
    onReply: () => void;
    onReact: (emoji: string) => void;
    onPin: () => void;
    onTranslate: (language: string) => void;
    onJump: (id: number) => void;
    onEdit: () => void;
    onDelete: () => void;
    onOpenImage: () => void;
    onShowReaders?: () => void;
    /** Groupes : nombre de membres ayant lu mon message (affiché sous mon dernier message). */
    seenBy?: { count: number; total: number } | null;
}) {
    const [menu, setMenu] = useState<'react' | 'translate' | null>(null);

    // Événements (appel, membre ajouté, groupe renommé…) : simple mention centrée.
    const eventType = message.meta?.type;
    if (message.kind === 'system' && (eventType === 'call' || eventType === 'group')) {
        return (
            <div id={`msg-${message.id}`} className="flex justify-center">
                <p className="max-w-[90%] rounded-full bg-ink-50 px-4 py-1.5 text-center text-[11px] text-ink-600">
                    {message.body} <span className="ml-1 text-ink-400">{clockTime(message.created_at)}</span>
                </p>
            </div>
        );
    }

    if (message.deleted) {
        return (
            <div id={`msg-${message.id}`} className={`flex items-end gap-3 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && <Avatar name={message.sender_name ?? '?'} src={message.sender_avatar} size="sm" />}
                <p
                    className={`flex items-center gap-2 rounded-2xl border border-dashed px-4 py-2.5 text-[12px] italic ${
                        mine ? 'rounded-br-md border-ink-300 text-ink-500' : 'rounded-bl-md border-ink-200 text-ink-500'
                    }`}
                >
                    <Ban className="h-3.5 w-3.5 shrink-0" />
                    {mine ? 'Vous avez supprimé ce message' : message.deleted_by_moderator ? 'Message supprimé par un administrateur' : 'Ce message a été supprimé'}
                    <span className="text-[10px] not-italic text-ink-400">{clockTime(message.created_at)}</span>
                </p>
            </div>
        );
    }

    if (message.kind === 'system') {
        return (
            <div id={`msg-${message.id}`} className={`flex justify-center transition-colors ${highlighted ? 'rounded-xl bg-gold-100/70' : ''}`}>
                <div className="flex max-w-[90%] gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-[13px] text-ink-800 shadow-sm sm:max-w-[75%]">
                    <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-800">EEHT Connect · rappel automatique</p>
                        <p className="mt-1 whitespace-pre-line break-words">{message.body}</p>
                        <p className="mt-1 text-right text-[10px] text-ink-400">{clockTime(message.created_at)}</p>
                    </div>
                </div>
            </div>
        );
    }

    const kind = message.attachment ? fileKind(message.attachment.name, message.attachment.mime) : null;
    const hasText = !!(message.subject || message.body);
    const ticks = mine && (message.id <= readUpTo ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : <Check className="h-3.5 w-3.5" />);

    return (
        <div
            id={`msg-${message.id}`}
            className={`group relative flex items-end gap-3 rounded-2xl transition-colors duration-700 ${mine ? 'justify-end' : 'justify-start'} ${
                highlighted ? 'bg-gold-100/70 py-1' : ''
            }`}
            onMouseLeave={() => setMenu(null)}
        >
            {!mine && <Avatar name={message.sender_name ?? '?'} src={message.sender_avatar} size="sm" />}

            <div className={`relative flex max-w-[78%] flex-col gap-1.5 sm:max-w-[65%] ${mine ? 'items-end' : 'items-start'}`}>
                {/* Barre d'actions au survol */}
                <div
                    className={`absolute -top-9 z-10 hidden items-center gap-0.5 rounded-lg border border-ink-100 bg-white px-1 py-0.5 shadow-md group-hover:flex ${
                        mine ? 'right-0' : 'left-0'
                    } ${menu ? '!flex' : ''}`}
                >
                    <ActionButton label="Répondre" onClick={onReply}>
                        <Reply className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton label="Réagir" onClick={() => setMenu(menu === 'react' ? null : 'react')}>
                        <SmilePlus className="h-4 w-4" />
                    </ActionButton>
                    {canPin && (
                        <ActionButton label={message.pinned ? 'Désépingler' : 'Épingler'} onClick={onPin}>
                            {message.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </ActionButton>
                    )}
                    {aiEnabled && message.body && (
                        <ActionButton label="Traduire" onClick={() => setMenu(menu === 'translate' ? null : 'translate')}>
                            <Languages className="h-4 w-4" />
                        </ActionButton>
                    )}
                    {message.body && (
                        <ActionButton label="Copier" onClick={() => navigator.clipboard?.writeText(message.body ?? '')}>
                            <Copy className="h-4 w-4" />
                        </ActionButton>
                    )}
                    {message.can_edit && (
                        <ActionButton label="Modifier" onClick={onEdit}>
                            <Pencil className="h-4 w-4" />
                        </ActionButton>
                    )}
                    {mine && isGroup && onShowReaders && (
                        <ActionButton label="Vu par" onClick={onShowReaders}>
                            <Eye className="h-4 w-4" />
                        </ActionButton>
                    )}
                    {message.can_delete && (
                        <ActionButton label="Supprimer pour tout le monde" onClick={onDelete}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </ActionButton>
                    )}

                    {menu === 'react' && (
                        <div className={`absolute top-9 flex gap-0.5 rounded-full border border-ink-100 bg-white p-1 shadow-lg ${mine ? 'right-0' : 'left-0'}`}>
                            {QUICK_REACTIONS.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => {
                                        onReact(e);
                                        setMenu(null);
                                    }}
                                    className="rounded-full p-1 text-lg transition-transform hover:scale-125"
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                    {menu === 'translate' && (
                        <div className={`absolute top-9 w-40 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg ${mine ? 'right-0' : 'left-0'}`}>
                            {Object.entries(languages).map(([code, label]) => (
                                <button
                                    key={code}
                                    onClick={() => {
                                        onTranslate(code);
                                        setMenu(null);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-xs text-ink-700 hover:bg-ink-50"
                                >
                                    En {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {hasText && (
                    <div
                        className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                            mine ? 'rounded-br-md bg-ink-900 text-white' : 'rounded-bl-md bg-[#eef2f8] text-ink-800'
                        }`}
                    >
                        {!mine && isGroup && <p className="mb-1 text-[11px] font-semibold text-gold-700">{message.sender_name}</p>}
                        {message.pinned && (
                            <p className={`mb-1 flex items-center gap-1 text-[10px] font-medium ${mine ? 'text-gold-300' : 'text-gold-700'}`}>
                                <Pin className="h-3 w-3" /> Épinglé
                            </p>
                        )}
                        {message.reply_to && (
                            <button
                                onClick={() => onJump(message.reply_to!.id)}
                                className={`mb-2 block w-full rounded-lg border-l-4 px-3 py-1.5 text-left text-xs ${
                                    mine ? 'border-gold-400 bg-white/10 text-white/80' : 'border-ink-700 bg-white/70 text-ink-600'
                                }`}
                            >
                                <span className="block font-semibold">{message.reply_to.sender_name}</span>
                                <span className="line-clamp-2">{message.reply_to.body ?? `📎 ${message.reply_to.attachment_name ?? ''}`}</span>
                            </button>
                        )}
                        {message.subject && <p className="mb-1 font-semibold">{message.subject}</p>}
                        {message.body && (
                            <p className="whitespace-pre-line break-words">
                                <RichText text={message.body} mentions={message.mentions} mine={mine} />
                            </p>
                        )}
                        {translation && (
                            <div className={`mt-2 border-t pt-2 text-[12px] italic ${mine ? 'border-white/20 text-white/85' : 'border-ink-200 text-ink-600'}`}>
                                <span className="mr-1 not-italic">🌐</span>
                                {translation.text ?? 'Traduction…'}
                            </div>
                        )}
                        <p className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-white/70' : 'text-ink-400'}`}>
                            {message.edited && <span className="italic">modifié</span>}
                            {clockTime(message.created_at)}
                            {ticks}
                        </p>
                    </div>
                )}

                {message.attachment && kind === 'image' && (
                    <button
                        onClick={onOpenImage}
                        className="block overflow-hidden rounded-2xl border border-ink-100 shadow-sm transition hover:opacity-95"
                        aria-label={`Agrandir la photo ${message.attachment.name}`}
                    >
                        <img src={message.attachment.url} alt={message.attachment.name} className="max-h-72 max-w-full object-cover" loading="lazy" />
                    </button>
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

                {message.reactions.length > 0 && (
                    <div className={`-mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
                        {message.reactions.map((r) => (
                            <button
                                key={r.emoji}
                                onClick={() => onReact(r.emoji)}
                                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm ${
                                    r.mine ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-ink-100 bg-white text-ink-700'
                                }`}
                            >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span className="font-medium">{r.count}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {seenBy && (
                    <button onClick={onShowReaders} className="-mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink-500 hover:text-ink-800">
                        <Eye className="h-3 w-3" />
                        {seenBy.count === 0 ? 'Pas encore lu' : seenBy.count >= seenBy.total ? 'Vu par tout le monde' : `Vu par ${seenBy.count}`}
                    </button>
                )}
            </div>
        </div>
    );
}

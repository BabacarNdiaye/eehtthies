import { Briefcase, CalendarClock, Download, GraduationCap, LogOut, Mail, MessageSquareText, MoreHorizontal, Phone, Smartphone, Video, X } from 'lucide-react';
import { useState } from 'react';
import Avatar, { groupIconFor } from './Avatar';
import FileIcon from './FileIcon';
import { ConversationDetails, ConversationSummary } from './types';
import { formatSize, relativeSeen, shortDate } from './utils';

function Row({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string | null; href?: string }) {
    if (!value) return null;
    return (
        <div className="flex gap-4 py-2.5">
            <Icon className="mt-1 h-5 w-5 shrink-0 text-ink-700" />
            <div className="min-w-0">
                <p className="text-[11px] text-ink-500">{label}</p>
                {href ? (
                    <a href={href} className="block truncate text-[13px] text-ink-900 hover:text-gold-700">
                        {value}
                    </a>
                ) : (
                    <p className="text-[13px] text-ink-900">{value}</p>
                )}
            </div>
        </div>
    );
}

function SectionTitle({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
    return (
        <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-900">{title}</h3>
            {action && (
                <button onClick={action.onClick} className="text-[11px] font-medium text-blue-700 hover:underline">
                    {action.label}
                </button>
            )}
        </div>
    );
}

export default function InfoPanel({
    conversation,
    details,
    onClose,
    onFocusComposer,
    onOpenConversation,
    onShowDocuments,
    onShowGroups,
    onLeave,
    onCall,
}: {
    conversation: ConversationSummary;
    details: ConversationDetails | null;
    onClose: () => void;
    onFocusComposer: () => void;
    onOpenConversation: (id: number) => void;
    onShowDocuments: () => void;
    onShowGroups: () => void;
    onLeave: () => void;
    onCall: (type: 'audio' | 'video') => void;
}) {
    const [allMembers, setAllMembers] = useState(false);
    const profile = details?.profile;
    const group = details?.group;
    const isGroup = conversation.type !== 'direct';
    const button = 'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 px-2 py-2.5 text-[11px] font-medium text-ink-800';

    return (
        <aside className="flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <button onClick={onClose} className="-mr-2 -mt-2 self-end rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 xl:hidden" aria-label="Fermer">
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4">
                <Avatar
                    name={conversation.name}
                    src={conversation.avatar}
                    size="lg"
                    group={isGroup}
                    groupIcon={groupIconFor(conversation.name, conversation.is_class, conversation.type)}
                />
                <div className="min-w-0">
                    <p className="font-serif text-lg font-bold text-ink-900">{conversation.name}</p>
                    {!isGroup && profile && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-700">
                            <span className={`h-2 w-2 rounded-full ${profile.online ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                            {profile.online ? 'En ligne' : 'Hors ligne'}
                        </p>
                    )}
                    <p className="mt-2 text-xs text-ink-600">
                        {conversation.type === 'assistant'
                            ? 'Rappels automatiques'
                            : isGroup
                              ? `${conversation.members_count} membres${group?.is_class ? ' · Groupe de classe' : ''}`
                              : [profile?.role, profile?.subtitle].filter(Boolean).join('  ·  ')}
                    </p>
                </div>
            </div>

            {!isGroup && (
                <div className="mt-5 flex gap-1.5">
                    <button onClick={onFocusComposer} className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-2.5 text-[11px] font-semibold text-white hover:bg-ink-800">
                        <MessageSquareText className="h-4 w-4" /> Message
                    </button>
                    <button onClick={() => onCall('audio')} className={`${button} hover:bg-ink-50`}>
                        <Phone className="h-4 w-4" /> Appel
                    </button>
                    <button onClick={() => onCall('video')} className={`${button} hover:bg-ink-50`}>
                        <Video className="h-4 w-4" /> Vidéo
                    </button>
                    <button onClick={onShowDocuments} className="flex shrink-0 items-center justify-center rounded-lg border border-ink-200 px-2 text-ink-700 hover:bg-ink-50" aria-label="Plus">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            )}

            {!details && <p className="mt-8 text-center text-sm text-ink-400">Chargement…</p>}

            {details && !isGroup && profile && (
                <div className="mt-6">
                    <h3 className="text-[13px] font-semibold text-ink-900">À propos</h3>
                    {profile.about && <p className="mt-2 text-[13px] leading-relaxed text-ink-700">{profile.about}</p>}
                    <div className="mt-3">
                        <Row icon={Mail} label="Email" value={profile.email} href={profile.email ? `mailto:${profile.email}` : undefined} />
                        <Row icon={Smartphone} label="Téléphone" value={profile.phone} href={profile.phone ? `tel:${profile.phone}` : undefined} />
                        <Row icon={GraduationCap} label="Formation" value={profile.formation} />
                        <Row icon={Briefcase} label="Poste" value={profile.position} />
                        <Row icon={CalendarClock} label="Disponibilité" value={profile.availability} />
                    </div>
                </div>
            )}

            {details && isGroup && group && (
                <div className="mt-6">
                    {group.description && <p className="mb-4 text-[13px] leading-relaxed text-ink-700">{group.description}</p>}
                    {conversation.type !== 'assistant' && (
                        <>
                            <SectionTitle
                                title={`Membres (${group.members.length})`}
                                action={group.members.length > 8 ? { label: allMembers ? 'Réduire' : 'Voir tout', onClick: () => setAllMembers((v) => !v) } : undefined}
                            />
                            <ul className="space-y-1">
                                {(allMembers ? group.members : group.members.slice(0, 8)).map((m) => (
                                    <li key={m.id} className="flex items-center gap-3 py-1.5">
                                        <Avatar name={m.name} src={m.avatar} size="sm" online={m.online} />
                                        <span className="min-w-0 flex-1 leading-tight">
                                            <span className="block truncate text-[13px] font-medium text-ink-900">{m.name}</span>
                                            <span className="block truncate text-[11px] text-ink-500">
                                                {m.role}
                                                {m.is_admin ? ' · Administrateur du groupe' : ''}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {group.can_leave && (
                        <button onClick={onLeave} className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600 hover:underline">
                            <LogOut className="h-3.5 w-3.5" /> Quitter le groupe
                        </button>
                    )}
                </div>
            )}

            {details && (
                <div className="mt-6 border-t border-ink-100 pt-5">
                    <SectionTitle title="Fichiers partagés" action={details.files_count > 0 ? { label: 'Voir tout', onClick: onShowDocuments } : undefined} />
                    {details.files.length === 0 && <p className="text-xs text-ink-400">Aucun fichier échangé pour l'instant.</p>}
                    <ul>
                        {details.files.slice(0, 3).map((f) => (
                            <li key={f.url} className="flex items-center gap-3 border-b border-ink-50 py-2.5 last:border-0">
                                <FileIcon name={f.name} mime={f.mime} size="sm" />
                                <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-ink-900">{f.name}</p>
                                    <p className="text-[10px] text-ink-500">
                                        {formatSize(f.size)} • {f.created_at ? shortDate(f.created_at) : ''}
                                    </p>
                                </a>
                                <a href={`${f.url}?download=1`} className="rounded p-1 text-ink-600 hover:bg-ink-50" aria-label="Télécharger">
                                    <Download className="h-4 w-4" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {details && !isGroup && (
                <div className="mt-5 border-t border-ink-100 pt-5">
                    <SectionTitle title="Groupes communs" action={details.common_groups?.length ? { label: 'Voir tout', onClick: onShowGroups } : undefined} />
                    {!details.common_groups?.length && <p className="text-xs text-ink-400">Aucun groupe en commun.</p>}
                    <ul>
                        {details.common_groups?.slice(0, 3).map((g) => (
                            <li key={g.id}>
                                <button onClick={() => onOpenConversation(g.id)} className="flex w-full items-center gap-3 py-2 text-left hover:opacity-80">
                                    <Avatar name={g.name} size="sm" group groupIcon={groupIconFor(g.name, g.is_class)} />
                                    <span className="leading-tight">
                                        <span className="block text-xs font-medium text-ink-900">{g.name}</span>
                                        <span className="text-[11px] text-ink-500">{g.members_count} membres</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!isGroup && profile && (
                <div className="mt-5 rounded-xl border border-ink-100 p-4">
                    <p className="text-[13px] font-semibold text-ink-900">Statut de la conversation</p>
                    <div className="mt-2 flex items-start gap-3">
                        <span className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full ${profile.online ? 'bg-emerald-100' : 'bg-ink-100'}`}>
                            <span className={`h-2 w-2 rounded-full ${profile.online ? 'bg-emerald-500' : 'bg-ink-400'}`} />
                        </span>
                        <div>
                            <p className={`text-[13px] font-medium ${profile.online ? 'text-blue-700' : 'text-ink-700'}`}>
                                {profile.online ? 'En ligne' : 'Hors ligne'}
                            </p>
                            <p className="text-[11px] text-ink-500">Dernière activité : {relativeSeen(profile.last_seen_at)}</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}

export interface Person {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
    subtitle: string | null;
    online: boolean;
    last_seen_at: string | null;
}

export interface Profile extends Person {
    about: string | null;
    email: string | null;
    phone: string | null;
    formation: string | null;
    position: string | null;
    availability: string | null;
}

export interface ConversationSummary {
    id: number;
    type: 'direct' | 'group' | 'assistant';
    is_class: boolean;
    name: string;
    avatar: string | null;
    other: Person | null;
    members_count: number;
    is_favorite: boolean;
    muted: boolean;
    muted_until: string | null;
    unread: number;
    mentions: number;
    last: { body: string; sender_name: string | null; created_at: string } | null;
    last_message_at: string;
}

export interface Attachment {
    name: string;
    size: number | null;
    mime: string | null;
    url: string;
    created_at?: string;
}

export interface Reaction {
    emoji: string;
    count: number;
    mine: boolean;
}

export interface ChatMessage {
    id: number;
    kind: 'user' | 'system';
    user_id: number | null;
    sender_name: string | null;
    sender_avatar: string | null;
    subject: string | null;
    body: string | null;
    attachment: Attachment | null;
    meta: Record<string, unknown> | null;
    reply_to: { id: number; sender_name: string; body: string | null; attachment_name: string | null } | null;
    reactions: Reaction[];
    mentions: { id: number; name: string }[];
    pinned: boolean;
    edited: boolean;
    deleted: boolean;
    deleted_by_moderator: boolean;
    can_edit: boolean;
    can_delete: boolean;
    created_at: string;
}

export interface PinnedMessage {
    id: number;
    sender_name: string;
    body: string;
}

export interface SearchResult {
    id: number;
    conversation_id: number;
    conversation_name: string;
    conversation_type: ConversationSummary['type'];
    sender_name: string;
    snippet: string;
    is_file: boolean;
    created_at: string;
}

export interface AiConfig {
    enabled: boolean;
    languages: Record<string, string>;
}

export interface ConversationDetails {
    files: Attachment[];
    files_count: number;
    profile?: Profile | null;
    common_groups?: { id: number; name: string; members_count: number; is_class: boolean }[];
    group?: {
        name: string;
        description: string | null;
        is_class: boolean;
        avatar: string | null;
        only_admins_can_write: boolean;
        can_manage: boolean;
        can_manage_members: boolean;
        can_leave: boolean;
        members: (Person & { is_admin: boolean })[];
    };
}

export interface Announcement {
    id: number;
    title: string;
    body: string;
    priority: 'normale' | 'importante' | 'urgente';
    author: string | null;
    created_at: string;
    read: boolean;
}

export interface DocumentItem extends Attachment {
    id: number;
    sender_name: string | null;
    conversation_id: number;
    conversation_name: string;
    created_at: string;
}

export type Section = 'messages' | 'groups' | 'announcements' | 'documents' | 'contacts' | 'profile';
export type Tab = 'all' | 'direct' | 'group' | 'favorites';

export interface ConnectLinks {
    prefix: string;
    home: string;
    password: string | null;
    calendar: string | null;
}

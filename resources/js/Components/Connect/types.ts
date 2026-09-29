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
    type: 'direct' | 'group';
    is_class: boolean;
    name: string;
    avatar: string | null;
    other: Person | null;
    members_count: number;
    is_favorite: boolean;
    unread: number;
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

export interface ChatMessage {
    id: number;
    user_id: number | null;
    sender_name: string | null;
    sender_avatar: string | null;
    subject: string | null;
    body: string | null;
    attachment: Attachment | null;
    created_at: string;
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

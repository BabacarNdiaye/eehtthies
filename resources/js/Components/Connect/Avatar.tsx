import { Building2, Sparkles, Users, UsersRound } from 'lucide-react';
import { initials } from './utils';

const palette = ['bg-ink-700', 'bg-gold-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-purple-600'];

function colorFor(name: string): string {
    return palette[name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % palette.length];
}

const sizes = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-[72px] w-[72px] text-xl',
};

const dotSizes = { xs: 'h-2 w-2', sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-4 w-4' };

export default function Avatar({
    name,
    src,
    size = 'md',
    online,
    group,
    groupIcon = 'users',
}: {
    name: string;
    src?: string | null;
    size?: keyof typeof sizes;
    online?: boolean;
    group?: boolean;
    groupIcon?: 'users' | 'class' | 'building' | 'assistant';
}) {
    const GroupIcon = groupIcon === 'assistant' ? Sparkles : groupIcon === 'building' ? Building2 : groupIcon === 'class' ? UsersRound : Users;

    return (
        <span className={`relative inline-flex shrink-0 ${sizes[size]}`}>
            {src ? (
                <img src={src} alt={name} className="h-full w-full rounded-full object-cover ring-2 ring-white" />
            ) : group ? (
                <span
                    className={`flex h-full w-full items-center justify-center rounded-full text-white ring-2 ring-white ${
                        groupIcon === 'assistant' ? 'bg-gradient-to-br from-gold-500 to-gold-700' : 'bg-ink-900'
                    }`}
                >
                    <GroupIcon className="h-1/2 w-1/2" />
                </span>
            ) : (
                <span
                    className={`flex h-full w-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${colorFor(name)}`}
                >
                    {initials(name)}
                </span>
            )}
            {online !== undefined && (
                <span
                    className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${dotSizes[size]} ${
                        online ? 'bg-emerald-500' : 'bg-ink-300'
                    }`}
                    aria-label={online ? 'En ligne' : 'Hors ligne'}
                />
            )}
        </span>
    );
}

export function groupIconFor(name: string, isClass: boolean, type?: string): 'users' | 'class' | 'building' | 'assistant' {
    if (type === 'assistant') return 'assistant';
    if (isClass) return 'class';
    return /admin|direction|secr[ée]tariat/i.test(name) ? 'building' : 'users';
}

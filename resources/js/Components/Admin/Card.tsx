import { HTMLAttributes, PropsWithChildren } from 'react';

export default function Card({
    children,
    className = '',
    hoverable = false,
    ...props
}: PropsWithChildren<{ className?: string; hoverable?: boolean } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>>) {
    return (
        <div
            {...props}
            className={`rounded-xl border border-ink-100 bg-white shadow-soft transition-shadow duration-200 ${
                hoverable ? 'hover:shadow-elevated' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

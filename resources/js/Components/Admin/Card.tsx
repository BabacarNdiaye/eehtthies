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
            className={`rounded-2xl border border-ink-100/80 bg-white shadow-soft transition-[box-shadow,transform] duration-200 ${
                hoverable ? 'hover:-translate-y-0.5 hover:shadow-elevated' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

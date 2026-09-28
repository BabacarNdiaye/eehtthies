import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { ReactNode } from 'react';

export default function PageHeader({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle?: string;
    action?: { label: string; href: string };
    children?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="font-serif text-2xl font-bold text-ink-900">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
                )}
            </div>
            <div className="flex items-center gap-3">
                {children}
                {action && (
                    <Link
                        href={action.href}
                        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                    >
                        <Plus className="h-4 w-4" />
                        {action.label}
                    </Link>
                )}
            </div>
        </div>
    );
}

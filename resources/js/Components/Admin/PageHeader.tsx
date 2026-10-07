import { Link } from '@inertiajs/react';
import { ChevronDown, Plus } from 'lucide-react';
import { Children, ReactNode, useId, useState } from 'react';

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
    const panelId = useId();
    const [open, setOpen] = useState(false);
    // À partir de trois contrôles secondaires, ils quittent la ligne du titre pour une barre d'outils en dessous ;
    // sur téléphone elle se replie derrière « Actions ». Les contrôles restent dans la page (masqués, jamais
    // démontés) : l'état d'un champ, comme la classe choisie pour les cartes, n'est pas perdu.
    const toolbar = Children.toArray(children).length >= 3;

    const primary = action && (
        <Link
            href={action.href}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
        >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {action.label}
        </Link>
    );

    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 flex-1 basis-64">
                <span className="mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-gold-500 to-gold-300" aria-hidden="true" />
                <h1 className="font-serif text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">{subtitle}</p>
                )}
            </div>

            {toolbar ? (
                <>
                    {primary}
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 md:hidden"
                    >
                        Actions
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        />
                    </button>
                    <div
                        id={panelId}
                        className={`basis-full flex-wrap items-center gap-2 max-md:rounded-2xl max-md:border max-md:border-ink-100 max-md:bg-white max-md:p-3 sm:gap-3 md:flex ${
                            open ? 'flex' : 'hidden'
                        }`}
                    >
                        {children}
                    </div>
                </>
            ) : (
                (children || primary) && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {children}
                        {primary}
                    </div>
                )
            )}
        </div>
    );
}

import { ReactNode } from 'react';

/**
 * En-tête des pages intérieures des espaces. Sur téléphone, le titre figure déjà dans l'en-tête compact de
 * PortalLayout : seuls le sous-titre et l'action restent ; sur ordinateur, le grand titre revient.
 */
export default function PortalPageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
    const hiddenOnPhone = !subtitle && !action ? 'max-lg:hidden' : '';

    return (
        <div className={`mb-5 flex items-start justify-between gap-3 lg:mb-6 lg:items-center ${hiddenOnPhone}`}>
            <div className="min-w-0">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">{title}</h1>
                {subtitle && <p className="text-sm text-ink-500 lg:mt-1">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

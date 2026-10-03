import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

/** Titre de section des accueils, avec un lien « Tout voir » facultatif à droite. */
export default function SectionTitle({ title, href, action = 'Tout voir' }: { title: string; href?: string; action?: string }) {
    return (
        <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-serif text-lg font-bold text-ink-900">{title}</h2>
            {href && (
                <Link
                    href={href}
                    className="inline-flex shrink-0 items-center rounded-full py-1 pl-2 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                >
                    {action}
                    <ChevronRight className="h-4 w-4" />
                </Link>
            )}
        </div>
    );
}

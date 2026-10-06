import { Link } from '@inertiajs/react';
import { Paginated, PaginationLink } from '@/types';

/** Les libellés de Laravel portent des entités HTML (« &laquo; Précédent ») : on les décode sans jamais injecter de HTML. */
function decode(label: string): string {
    const box = document.createElement('textarea');
    box.innerHTML = label;

    return box.value;
}

const pill = 'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150';

function Step({ link, className = '' }: { link: PaginationLink; className?: string }) {
    const text = decode(link.label);

    if (!link.url) {
        return (
            <span aria-disabled="true" className={`${pill} cursor-not-allowed text-ink-400 ${className}`}>
                {text}
            </span>
        );
    }

    return (
        <Link href={link.url} preserveScroll className={`${pill} text-ink-700 hover:bg-ink-100 ${className}`}>
            {text}
        </Link>
    );
}

export default function Pagination<T>({ data }: { data: Paginated<T> }) {
    if (data.last_page <= 1) return null;

    const previous = data.links[0];
    const next = data.links[data.links.length - 1];

    return (
        <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm sm:px-6"
        >
            <p className="text-ink-500">
                Affichage de <span className="font-medium">{data.from ?? 0}</span> à{' '}
                <span className="font-medium">{data.to ?? 0}</span> sur{' '}
                <span className="font-medium">{data.total}</span> résultats
            </p>

            {/* Tablette et ordinateur : toutes les pages. */}
            <ul className="hidden flex-wrap items-center gap-1 sm:flex">
                {data.links.map((link, index) => {
                    const text = decode(link.label);
                    const isPage = /^\d+$/.test(text);

                    return (
                        <li key={index}>
                            {link.url ? (
                                <Link
                                    href={link.url}
                                    preserveScroll
                                    aria-label={isPage ? `Page ${text}` : undefined}
                                    aria-current={link.active ? 'page' : undefined}
                                    className={`${pill} ${link.active ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}
                                >
                                    {text}
                                </Link>
                            ) : (
                                <span aria-disabled={isPage ? undefined : 'true'} className={`${pill} text-ink-500 ${isPage ? '' : 'cursor-not-allowed'}`}>
                                    {text}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Téléphone : précédent, page courante, suivant. */}
            <div className="flex w-full items-center justify-between gap-2 sm:hidden">
                <Step link={previous} className="flex min-h-11 items-center" />
                <span className="text-xs font-medium text-ink-600">
                    Page {data.current_page} / {data.last_page}
                </span>
                <Step link={next} className="flex min-h-11 items-center" />
            </div>
        </nav>
    );
}

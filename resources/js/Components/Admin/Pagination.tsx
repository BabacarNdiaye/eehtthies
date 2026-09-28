import { Link } from '@inertiajs/react';
import { Paginated } from '@/types';

export default function Pagination<T>({ data }: { data: Paginated<T> }) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm sm:px-6">
            <p className="text-ink-500">
                Affichage de <span className="font-medium">{data.from ?? 0}</span> à{' '}
                <span className="font-medium">{data.to ?? 0}</span> sur{' '}
                <span className="font-medium">{data.total}</span> résultats
            </p>
            <div className="flex flex-wrap gap-1">
                {data.links.map((link, i) => (
                    <Link
                        key={i}
                        href={link.url ?? '#'}
                        preserveScroll
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                            link.active
                                ? 'bg-ink-900 text-white'
                                : link.url
                                  ? 'text-ink-600 hover:bg-ink-100'
                                  : 'cursor-not-allowed text-ink-300'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

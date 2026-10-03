import { formatAverage, subjectStyle } from '@/lib/portal';
import { Link } from '@inertiajs/react';

interface Props {
    name: string;
    average?: number | null;
    href: string;
    caption?: string | null;
}

/**
 * Tuile de matière façon application mobile : carré arrondi en dégradé avec icône, libellé dessous et
 * pastille de moyenne (sur 20) quand une note est publiée.
 */
export default function SubjectTile({ name, average, href, caption }: Props) {
    const { icon: Icon, gradient } = subjectStyle(name);

    return (
        <Link
            href={href}
            className="group flex flex-col items-center gap-2 rounded-3xl text-center outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
            <span
                className={`relative flex aspect-square w-full max-w-[104px] items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} text-white shadow-md transition-transform duration-200 group-active:scale-95 lg:group-hover:-translate-y-0.5`}
            >
                <Icon className="h-9 w-9" strokeWidth={1.9} />
                {average != null && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-800 shadow">
                        {formatAverage(average)}
                    </span>
                )}
            </span>
            <span className="min-w-0">
                {/* Pas de « block » : il annulerait le display -webkit-box de line-clamp et le texte ne serait plus tronqué. */}
                <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink-800">{name}</span>
                {caption && <span className="mt-0.5 line-clamp-1 text-[10.5px] text-ink-400">{caption}</span>}
            </span>
        </Link>
    );
}

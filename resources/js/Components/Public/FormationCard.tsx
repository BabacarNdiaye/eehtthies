import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import { initials, storageUrl } from '@/lib/publicFormat';
import { Formation } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

/**
 * Carte de formation (accueil, liste). Toute la carte est cliquable, mais le lien ne porte que le titre : un lecteur
 * d'écran annonce « CAP Restauration », pas le paragraphe de présentation. La durée est en haut à droite : en bas, la
 * découpe oblique de l'image la rognait.
 */
export default function FormationCard({ formation }: { formation: Formation }) {
    const image = storageUrl(formation.image);

    return (
        <article className="group relative flex h-full flex-col bg-white shadow-sm transition duration-300 focus-within:ring-2 focus-within:ring-gold-500 hover:-translate-y-1.5 hover:shadow-2xl">
            <div className="relative h-44 w-full overflow-hidden sm:h-52" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 84%, 0 100%)' }}>
                {image ? (
                    <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                ) : (
                    <ImagePlaceholder className="h-full w-full" label={initials(formation.name)} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
                {formation.diploma && (
                    <span className="absolute left-4 top-4 bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                        {formation.diploma}
                    </span>
                )}
                {formation.duration && (
                    <span className="absolute right-4 top-4 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                        {formation.duration}
                    </span>
                )}
            </div>
            <span className="h-1 w-full bg-gradient-to-r from-gold-400 via-brand-500 to-leaf-400" />
            <div className="flex flex-1 flex-col border-x border-b border-ink-100 p-5 sm:p-7">
                <h3 className="font-serif text-xl font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
                    <Link href={route('formations.show', formation.slug)} className="outline-none after:absolute after:inset-0">
                        {formation.name}
                    </Link>
                </h3>
                {formation.description && <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">{formation.description}</p>}
                <span aria-hidden="true" className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-ink-900 sm:mt-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white transition duration-300 group-hover:rotate-45 group-hover:bg-brand-600">
                        <ChevronRight className="h-4 w-4" />
                    </span>
                    Voir la formation
                </span>
            </div>
        </article>
    );
}

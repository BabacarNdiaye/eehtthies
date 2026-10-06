import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import { formatDateLong, storageUrl } from '@/lib/publicFormat';
import { NewsArticle } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight, Newspaper } from 'lucide-react';

/** Carte d'actualité (accueil). Toute la carte est cliquable ; le lien ne porte que le titre (voir FormationCard). */
export default function NewsCard({ article }: { article: NewsArticle }) {
    const image = storageUrl(article.image);

    return (
        <article className="group relative flex h-full flex-col bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-gold-500 hover:shadow-xl">
            <div className="relative h-40 w-full overflow-hidden sm:h-48" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 84%, 0 100%)' }}>
                {image ? (
                    <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <ImagePlaceholder className="h-full w-full" icon={Newspaper} />
                )}
            </div>
            <div className="flex flex-1 flex-col border-x border-b border-ink-100 p-5 sm:p-6">
                <span className="h-0.5 w-10 bg-gold-500" />
                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                    <span className="text-brand-600">{article.category ?? 'Actualité'}</span>
                    <span className="text-ink-500">{formatDateLong(article.published_at)}</span>
                </div>
                <h3 className="mt-3 font-serif text-lg font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
                    <Link href={route('news.show', article.slug)} className="outline-none after:absolute after:inset-0">
                        {article.title}
                    </Link>
                </h3>
                {article.excerpt && <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">{article.excerpt}</p>}
                <span aria-hidden="true" className="mt-5 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-ink-900">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-700 transition group-hover:bg-gold-500 group-hover:text-ink-900">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                    Lire la suite
                </span>
            </div>
        </article>
    );
}

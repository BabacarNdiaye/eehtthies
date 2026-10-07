import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { NewsArticle, Paginated } from '@/types';
import { formatDateLong, storageUrl } from '@/lib/publicFormat';
import { decodeEntities } from '@/lib/html';
import { Head, Link } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';

export default function NewsIndex({
    articles,
}: {
    articles: Paginated<NewsArticle>;
}) {
    return (
        <PublicLayout>
            <Head title="Actualités - EEHT de Thiès" />

            <PageHero
                eyebrow="Vie de l'école"
                title="Actualités"
                subtitle="Toute l'actualité de l'EEHT de Thiès : événements, réussites de nos étudiants, partenariats et vie pédagogique."
            />

            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {articles.data.length === 0 ? (
                        <p className="text-center text-ink-500">
                            Aucune actualité publiée pour le moment.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {articles.data.map((article, i) => {
                                const image = storageUrl(article.image);
                                return (
                                    <Reveal key={article.id} delay={(i % 6) * 70}>
                                    <Link
                                        href={route(
                                            'news.show',
                                            article.slug,
                                        )}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <div className="h-48 w-full">
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={article.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <ImagePlaceholder
                                                    className="h-full w-full"
                                                    icon={Newspaper}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-col p-6">
                                            {article.category && (
                                                <span className="mb-2 inline-block w-fit rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-medium text-gold-700">
                                                    {article.category}
                                                </span>
                                            )}
                                            <h2 className="font-serif text-lg font-bold text-ink-900 transition group-hover:text-gold-600">
                                                {article.title}
                                            </h2>
                                            {article.excerpt && (
                                                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-500">
                                                    {article.excerpt}
                                                </p>
                                            )}
                                            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-400">
                                                {formatDateLong(
                                                    article.published_at,
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    {articles.last_page > 1 && (
                        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                            {articles.links.map((link, i) => {
                                const text = decodeEntities(link.label);
                                const classes = `rounded-full px-4 py-2 text-sm font-medium transition ${
                                    link.active ? 'bg-ink-900 text-white' : link.url ? 'text-ink-600 hover:bg-ink-100' : 'cursor-not-allowed text-ink-300'
                                }`;

                                return link.url ? (
                                    <Link key={i} href={link.url} preserveScroll aria-current={link.active ? 'page' : undefined} className={classes}>
                                        {text}
                                    </Link>
                                ) : (
                                    <span key={i} aria-disabled="true" className={classes}>
                                        {text}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

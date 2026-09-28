import PublicLayout from '@/Layouts/PublicLayout';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { NewsArticle } from '@/types';
import { formatDateLong, storageUrl } from '@/lib/publicFormat';
import { Head, Link } from '@inertiajs/react';
import { Calendar, Facebook, Newspaper, User } from 'lucide-react';

export default function NewsShow({
    article,
    others,
}: {
    article: NewsArticle & { author: { name: string } | null };
    others: NewsArticle[];
}) {
    const image = storageUrl(article.image);
    const photos = article.photos ?? [];

    return (
        <PublicLayout>
            <Head title={`${article.title} - EEHT de Thiès`} />

            <section className="relative h-[45vh] min-h-[360px] w-full overflow-hidden bg-ink-900">
                {image ? (
                    <img
                        src={image}
                        alt={article.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <ImagePlaceholder
                        className="h-full w-full"
                        icon={Newspaper}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-10 sm:px-6 lg:px-8">
                    {article.category && (
                        <span className="mb-3 inline-block rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold text-ink-900">
                            {article.category}
                        </span>
                    )}
                    <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
                        {article.title}
                    </h1>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-300">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-gold-400" />
                            {formatDateLong(article.published_at)}
                        </span>
                        {article.author && (
                            <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4 text-gold-400" />
                                {article.author.name}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className="py-16 sm:py-20">
                <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="whitespace-pre-line text-base leading-relaxed text-ink-700">
                        {article.content}
                    </div>

                    {article.source === 'facebook' &&
                        article.facebook_post_url && (
                            <a
                                href={article.facebook_post_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:opacity-90"
                            >
                                <Facebook className="h-4 w-4" />
                                Voir la publication originale sur Facebook
                            </a>
                        )}

                    {photos.length > 0 && (
                        <div className="mt-10">
                            <h2 className="mb-4 font-serif text-xl font-bold text-ink-900">Photos</h2>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {photos.map((photo) => (
                                    <a
                                        key={photo.id}
                                        href={`/storage/${photo.path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl"
                                    >
                                        <img
                                            src={`/storage/${photo.path}`}
                                            alt={photo.caption ?? article.title}
                                            loading="lazy"
                                            className="h-40 w-full object-cover transition duration-500 hover:scale-105"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </Reveal>
            </section>

            {others.length > 0 && (
                <section className="bg-ink-50 py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <h2 className="mb-8 font-serif text-2xl font-bold text-ink-900">
                                Autres actualités
                            </h2>
                        </Reveal>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {others.map((item, i) => {
                                const otherImage = storageUrl(item.image);
                                return (
                                    <Reveal key={item.id} delay={i * 80}>
                                    <Link
                                        href={route('news.show', item.slug)}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <div className="h-40 w-full">
                                            {otherImage ? (
                                                <img
                                                    src={otherImage}
                                                    alt={item.title}
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
                                        <div className="p-5">
                                            <h3 className="font-serif text-base font-bold text-ink-900 transition group-hover:text-gold-600">
                                                {item.title}
                                            </h3>
                                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                                                {formatDateLong(
                                                    item.published_at,
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}

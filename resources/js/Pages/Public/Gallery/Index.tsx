import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { Gallery, GalleryMediaItem } from '@/types';
import { storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Images,
    PlayCircle,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type MediaWithGallery = GalleryMediaItem & { galleryTitle: string };

export default function GalleryIndex({
    galleries,
}: {
    galleries: (Gallery & { media: GalleryMediaItem[] })[];
}) {
    const categories = useMemo(() => {
        const set = new Set<string>();
        galleries.forEach((g) => {
            if (g.category) set.add(g.category);
        });
        return Array.from(set);
    }, [galleries]);

    const [activeCategory, setActiveCategory] = useState<string>('Tous');

    const allMedia: MediaWithGallery[] = useMemo(() => {
        return galleries
            .filter(
                (g) =>
                    activeCategory === 'Tous' || g.category === activeCategory,
            )
            .flatMap((g) =>
                (g.media ?? []).map((m) => ({
                    ...m,
                    galleryTitle: g.title,
                })),
            );
    }, [galleries, activeCategory]);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = (index: number) => setLightboxIndex(index);
    const closeLightbox = () => setLightboxIndex(null);
    const showPrev = () =>
        setLightboxIndex((i) =>
            i === null ? null : (i - 1 + allMedia.length) % allMedia.length,
        );
    const showNext = () =>
        setLightboxIndex((i) =>
            i === null ? null : (i + 1) % allMedia.length,
        );

    const current = lightboxIndex !== null ? allMedia[lightboxIndex] : null;

    return (
        <PublicLayout>
            <Head title="Galerie photos et vidéos - EEHT de Thiès" />

            <PageHero
                eyebrow="Immersion visuelle"
                title="Galerie"
                subtitle="Ateliers pratiques, événements, remises de diplômes et vie quotidienne à l'EEHT de Thiès en images."
            />

            <section className="py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-10 flex flex-wrap justify-center gap-2">
                        <button
                            onClick={() => setActiveCategory('Tous')}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                                activeCategory === 'Tous'
                                    ? 'bg-ink-900 text-white'
                                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                            }`}
                        >
                            Tous
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                                    activeCategory === category
                                        ? 'bg-ink-900 text-white'
                                        : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {allMedia.length === 0 ? (
                        <p className="text-center text-ink-500">
                            Aucun média disponible pour cette catégorie.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {allMedia.map((media, index) => {
                                const src = storageUrl(media.path);
                                return (
                                    <Reveal key={media.id} delay={(index % 8) * 50}>
                                    <button
                                        onClick={() => openLightbox(index)}
                                        className="group relative aspect-square w-full overflow-hidden rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        {src ? (
                                            <img
                                                src={src}
                                                alt={
                                                    media.caption ??
                                                    media.galleryTitle
                                                }
                                                loading="lazy"
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <ImagePlaceholder
                                                className="h-full w-full"
                                                icon={Images}
                                            />
                                        )}
                                        {media.type === 'video' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/30">
                                                <PlayCircle className="h-10 w-10 text-white" />
                                            </div>
                                        )}
                                    </button>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {current && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 p-4">
                    <button
                        onClick={closeLightbox}
                        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <button
                        onClick={showPrev}
                        className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
                        aria-label="Précédent"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    <div className="max-h-[85vh] max-w-4xl">
                        {current.type === 'video' ? (
                            <video
                                src={storageUrl(current.path) ?? undefined}
                                controls
                                autoPlay
                                className="max-h-[80vh] w-full rounded-lg"
                            />
                        ) : (
                            <img
                                src={storageUrl(current.path) ?? undefined}
                                alt={current.caption ?? current.galleryTitle}
                                className="max-h-[80vh] w-full rounded-lg object-contain"
                            />
                        )}
                        {current.caption && (
                            <p className="mt-3 text-center text-sm text-ink-300">
                                {current.caption}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={showNext}
                        className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
                        aria-label="Suivant"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>
            )}
        </PublicLayout>
    );
}

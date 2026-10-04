import { PatternOverlay } from '@/Components/Public/ImagePlaceholder';
import { storageUrl } from '@/lib/publicFormat';
import { Slider } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from 'lucide-react';
import { TouchEvent, useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hero de l'accueil. Sans diapositive configurée : bannière de présentation. Avec des diapositives (Admin ›
 * Diaporama) : fondu toutes les 6 s, balayage au doigt, flèches dès `sm`, pastilles et bouton pause. Le défilement
 * s'arrête aussi au survol, au focus et au toucher, et ne démarre pas si l'utilisateur préfère moins d'animations.
 * Sous `lg` le hero est moins haut (`svh`, stable avec la barre d'adresse du téléphone) et laisse la place des
 * raccourcis qui le chevauchent.
 */
export default function HeroSlider({ sliders }: { sliders: Slider[] }) {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(() => !prefersReducedMotion());
    const [held, setHeld] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const count = sliders.length;

    useEffect(() => {
        if (count <= 1 || !playing || held) return;

        const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);

        return () => clearInterval(id);
    }, [count, playing, held]);

    const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

    const onTouchStart = (event: TouchEvent) => {
        touchStartX.current = event.touches[0].clientX;
        setHeld(true);
    };
    const onTouchEnd = (event: TouchEvent) => {
        const start = touchStartX.current;

        touchStartX.current = null;
        setHeld(false);

        if (start === null) return;

        const deltaX = event.changedTouches[0].clientX - start;

        if (Math.abs(deltaX) > 50) go(deltaX < 0 ? 1 : -1);
    };

    if (count === 0) {
        return (
            <section className="relative flex min-h-[78svh] items-center overflow-hidden bg-ink-950 pb-14 lg:min-h-[88vh] lg:pb-0">
                <PatternOverlay />
                <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-leaf-500/10 blur-3xl" aria-hidden />
                <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        Elite École Hôtelière et Touristique de Thiès
                    </span>
                    <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                        L'excellence au service de vos{' '}
                        <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-brand-300 bg-clip-text text-transparent">
                            ambitions hôtelières &amp; touristiques
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
                        Depuis de nombreuses années, l'EEHT de Thiès forme les talents de demain dans l'hôtellerie, la restauration et le
                        tourisme, alliant excellence académique et savoir-faire professionnel.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route('formations.index')}
                            className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg"
                        >
                            Découvrir nos formations
                        </Link>
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                        >
                            Candidater maintenant
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Diaporama d'accueil"
            className="relative min-h-[78svh] w-full overflow-hidden bg-ink-950 lg:min-h-[88vh]"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {sliders.map((slide, i) => {
                const image = storageUrl(slide.image);

                return (
                    <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${i === index ? 'opacity-100' : 'opacity-0'}`}>
                        {image ? (
                            <img
                                src={image}
                                alt=""
                                loading={i === 0 ? 'eager' : 'lazy'}
                                fetchPriority={i === 0 ? 'high' : 'auto'}
                                decoding="async"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-gradient-to-br from-ink-950 via-brand-900 to-ink-900" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-ink-950/30" />
                    </div>
                );
            })}

            <div className="relative flex min-h-[78svh] items-center pb-14 lg:min-h-[88vh] lg:pb-0">
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8" aria-live={playing ? 'off' : 'polite'}>
                    {sliders.map((slide, i) => (
                        <div
                            key={slide.id}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${i + 1} sur ${count}`}
                            className={`transition-all duration-700 motion-reduce:transition-none ${i === index ? 'relative opacity-100' : 'absolute inset-0 opacity-0'}`}
                        >
                            {i === index && (
                                <>
                                    <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        EEHT de Thiès
                                    </span>
                                    <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">{slide.title}</h1>
                                    {slide.subtitle && <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-ink-200">{slide.subtitle}</p>}
                                    {slide.button_text && slide.button_link && (
                                        <div className="mt-10">
                                            <Link
                                                href={slide.button_link}
                                                className="inline-flex rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg"
                                            >
                                                {slide.button_text}
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {count > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Diapositive précédente"
                        className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-8 sm:flex"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Diapositive suivante"
                        className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-8 sm:flex"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center lg:bottom-6">
                        {sliders.map((slide, i) => (
                            <button key={slide.id} type="button" onClick={() => setIndex(i)} aria-label={`Aller à la diapositive ${i + 1}`} aria-current={i === index} className="p-2">
                                <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-8 bg-gold-400' : 'w-2 bg-white/50'}`} />
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPlaying((value) => !value)}
                        aria-pressed={!playing}
                        aria-label={playing ? 'Mettre le diaporama en pause' : 'Relancer le diaporama'}
                        className="absolute bottom-10 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-8 lg:bottom-5"
                    >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                </>
            )}
        </section>
    );
}

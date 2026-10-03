import { ReactNode } from 'react';
import { PatternOverlay } from '@/Components/Public/ImagePlaceholder';

/**
 * Bannière sombre standard en haut des pages publiques intérieures (À propos, Enseignants, Partenaires,
 * Témoignages, FAQ, Contact, Formations, Actualités, Événements, Galerie...).
 */
export default function PageHero({
    eyebrow,
    title,
    subtitle,
    children,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden bg-ink-900 py-24 sm:py-28">
            <PatternOverlay />
            <div
                className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
                aria-hidden
            />
            <div className="relative mx-auto max-w-4xl animate-fade-in-up px-4 text-center sm:px-6 lg:px-8">
                {eyebrow && (
                    <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                        {eyebrow}
                    </span>
                )}
                <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-300">
                        {subtitle}
                    </p>
                )}
                {children}
            </div>
        </section>
    );
}

import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { EventItem } from '@/types';
import { storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { CalendarDays, MapPin, PartyPopper } from 'lucide-react';

function DateBadge({ date }: { date: string }) {
    const d = new Date(date);
    const day = d.toLocaleDateString('fr-FR', { day: '2-digit' });
    const month = d.toLocaleDateString('fr-FR', { month: 'short' });

    return (
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-900 text-white">
            <span className="font-serif text-xl font-bold leading-none">
                {day}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gold-400">
                {month}
            </span>
        </div>
    );
}

export default function EventsIndex({
    upcoming,
    past,
}: {
    upcoming: EventItem[];
    past: EventItem[];
}) {
    return (
        <PublicLayout>
            <Head title="Événements - EEHT de Thiès" />

            <PageHero
                eyebrow="Vie de l'école"
                title="Événements"
                subtitle="Journées portes ouvertes, salons professionnels, concours culinaires, remises de diplômes... Suivez l'actualité événementielle de l'EEHT de Thiès."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <Reveal className="mb-6 flex items-center gap-2">
                        <PartyPopper className="h-5 w-5 text-gold-500" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">
                            Événements à venir
                        </h2>
                    </Reveal>

                    {upcoming.length === 0 ? (
                        <p className="text-ink-500">
                            Aucun événement à venir n'est programmé pour le
                            moment.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            {upcoming.map((event, i) => {
                                const image = storageUrl(event.image);
                                return (
                                    <Reveal key={event.id} delay={i * 80}>
                                    <div
                                        className="flex h-full gap-5 overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <DateBadge date={event.start_at} />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-serif text-lg font-bold text-ink-900">
                                                {event.title}
                                            </h3>
                                            {event.location && (
                                                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                                                    <MapPin className="h-3.5 w-3.5 text-gold-500" />
                                                    {event.location}
                                                </p>
                                            )}
                                            {event.description && (
                                                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-500">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                        {image && (
                                            <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:block">
                                                <img
                                                    src={image}
                                                    alt={event.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-ink-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <Reveal className="mb-6 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-ink-400" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">
                            Événements passés
                        </h2>
                    </Reveal>

                    {past.length === 0 ? (
                        <p className="text-ink-500">
                            Aucun événement passé à afficher.
                        </p>
                    ) : (
                        <Reveal delay={100} className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
                            {past.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="w-24 shrink-0 text-sm font-medium text-ink-400">
                                            {new Date(
                                                event.start_at,
                                            ).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        <span className="font-medium text-ink-700">
                                            {event.title}
                                        </span>
                                    </div>
                                    {event.location && (
                                        <span className="flex items-center gap-1.5 text-sm text-ink-400">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {event.location}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </Reveal>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

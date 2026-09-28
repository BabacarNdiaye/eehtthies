import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import StarRating from '@/Components/Public/StarRating';
import Reveal from '@/Components/Public/Reveal';
import { Testimonial } from '@/types';
import { initials, storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Quote } from 'lucide-react';

export default function Testimonials({
    testimonials,
}: {
    testimonials: Testimonial[];
}) {
    return (
        <PublicLayout>
            <Head title="Témoignages - EEHT de Thiès" />

            <PageHero
                eyebrow="Ils nous font confiance"
                title="Témoignages"
                subtitle="Découvrez les parcours et les retours de nos étudiants, diplômés et partenaires sur leur expérience à l'EEHT de Thiès."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    {testimonials.length === 0 ? (
                        <p className="text-center text-ink-500">
                            Les témoignages seront bientôt disponibles.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            {testimonials.map((testimonial, i) => {
                                const photo = storageUrl(testimonial.photo);
                                return (
                                    <Reveal key={testimonial.id} delay={(i % 6) * 70}>
                                    <div
                                        className="relative flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <Quote className="h-8 w-8 text-gold-200" />
                                        <p className="mt-4 flex-1 text-base leading-relaxed text-ink-600">
                                            « {testimonial.content} »
                                        </p>
                                        <StarRating
                                            rating={testimonial.rating}
                                            className="mt-6"
                                        />
                                        <div className="mt-5 flex items-center gap-4 border-t border-ink-100 pt-5">
                                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
                                                {photo ? (
                                                    <img
                                                        src={photo}
                                                        alt={testimonial.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full rounded-full"
                                                        label={initials(
                                                            testimonial.name,
                                                        )}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-serif text-base font-bold text-ink-900">
                                                    {testimonial.name}
                                                </div>
                                                <div className="text-sm text-ink-500">
                                                    {testimonial.role}
                                                    {testimonial.formation
                                                        ? ` — ${testimonial.formation.name}`
                                                        : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

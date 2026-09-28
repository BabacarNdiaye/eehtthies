import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { InternshipOffer } from '@/types';
import { storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Briefcase, Building2, Calendar, Users } from 'lucide-react';

export default function Index({ offers }: { offers: InternshipOffer[] }) {
    return (
        <PublicLayout>
            <Head title="Offres de stage - EEHT de Thiès" />

            <PageHero
                eyebrow="Insertion professionnelle"
                title="Offres de stage"
                subtitle="Découvrez les opportunités de stage proposées par nos entreprises partenaires dans l'hôtellerie, la restauration et le tourisme."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {offers.length === 0 ? (
                        <p className="text-center text-ink-500">Aucune offre de stage disponible pour le moment. Revenez bientôt !</p>
                    ) : (
                        <div className="space-y-6">
                            {offers.map((offer, i) => {
                                const logo = storageUrl(offer.partner?.logo ?? null);
                                return (
                                    <Reveal key={offer.id} delay={i * 60}>
                                    <div className="flex flex-col gap-5 rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-soft sm:flex-row sm:items-start">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                            {logo ? (
                                                <img src={logo} alt={offer.partner?.name} loading="lazy" className="h-full w-full object-cover" />
                                            ) : (
                                                <ImagePlaceholder className="h-full w-full rounded-xl" icon={Building2} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-serif text-lg font-bold text-ink-900">{offer.title}</h3>
                                            <p className="text-sm font-medium text-gold-700">{offer.partner?.name}</p>
                                            {offer.description && <p className="mt-3 text-sm leading-relaxed text-ink-500">{offer.description}</p>}
                                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-500">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Users className="h-3.5 w-3.5 text-gold-600" />
                                                    {offer.positions_available} place(s)
                                                </span>
                                                {offer.formation && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Briefcase className="h-3.5 w-3.5 text-gold-600" />
                                                        {offer.formation.name}
                                                    </span>
                                                )}
                                                {offer.start_date && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-gold-600" />
                                                        {new Date(offer.start_date).toLocaleDateString('fr-FR')}
                                                        {offer.end_date ? ` — ${new Date(offer.end_date).toLocaleDateString('fr-FR')}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    <Reveal className="mt-16 rounded-2xl bg-ink-50 px-8 py-10 text-center">
                        <h3 className="font-serif text-lg font-bold text-ink-900">Intéressé(e) par une offre ?</h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
                            Contactez le service des stages de l'EEHT ou rendez-vous dans votre espace élève pour candidater.
                        </p>
                        <a href={route('pages.contact')} className="mt-5 inline-block rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400">
                            Nous contacter
                        </a>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
}

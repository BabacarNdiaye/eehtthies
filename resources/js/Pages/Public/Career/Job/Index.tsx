import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { JobOffer } from '@/types';
import { storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Building2, MapPin } from 'lucide-react';

const contractLabels: Record<string, string> = {
    cdi: 'CDI',
    cdd: 'CDD',
    stage: 'Stage',
    saisonnier: 'Saisonnier',
};

const contractStyles: Record<string, string> = {
    cdi: 'bg-emerald-100 text-emerald-700',
    cdd: 'bg-blue-100 text-blue-700',
    stage: 'bg-gold-100 text-gold-800',
    saisonnier: 'bg-purple-100 text-purple-700',
};

export default function Index({ offers }: { offers: JobOffer[] }) {
    return (
        <PublicLayout>
            <Head title="Offres d'emploi - EEHT de Thiès" />

            <PageHero
                eyebrow="Débouchés professionnels"
                title="Offres d'emploi"
                subtitle="Retrouvez les opportunités d'emploi proposées par les entreprises partenaires de l'EEHT de Thiès."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {offers.length === 0 ? (
                        <p className="text-center text-ink-500">Aucune offre d'emploi disponible pour le moment.</p>
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
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="font-serif text-lg font-bold text-ink-900">{offer.title}</h3>
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${contractStyles[offer.contract_type]}`}>
                                                    {contractLabels[offer.contract_type]}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gold-700">{offer.partner?.name}</p>
                                            {offer.description && <p className="mt-3 text-sm leading-relaxed text-ink-500">{offer.description}</p>}
                                            {offer.location && (
                                                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
                                                    <MapPin className="h-3.5 w-3.5 text-gold-600" /> {offer.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    <Reveal className="mt-16 rounded-2xl bg-ink-50 px-8 py-10 text-center">
                        <h3 className="font-serif text-lg font-bold text-ink-900">Vous recrutez ?</h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
                            Confiez-nous vos offres d'emploi et accédez à un vivier de jeunes professionnels formés aux
                            métiers de l'hôtellerie, de la restauration et du tourisme.
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

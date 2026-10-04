import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { Partner } from '@/types';
import { storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Building2, ExternalLink, Handshake } from 'lucide-react';

export default function Partners({ partners }: { partners: Partner[] }) {
    return (
        <PublicLayout>
            <Head title="Nos partenaires - EEHT de Thiès" />

            <PageHero
                eyebrow="Un réseau de confiance"
                title="Nos partenaires"
                subtitle="L'EEHT de Thiès collabore avec des hôtels, restaurants, agences de voyage et institutions qui accompagnent nos étudiants vers l'insertion professionnelle."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {partners.length === 0 ? (
                        <p className="text-center text-ink-500">
                            Nos partenariats seront bientôt présentés ici.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {partners.map((partner, i) => {
                                const logo = storageUrl(partner.logo);
                                return (
                                    <Reveal key={partner.id} delay={(i % 6) * 70}>
                                    <div
                                        className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                                                {logo ? (
                                                    <img
                                                        src={logo}
                                                        alt={partner.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full rounded-xl"
                                                        icon={Building2}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-base font-bold text-ink-900">
                                                    {partner.name}
                                                </h3>
                                                {partner.type && (
                                                    <span className="mt-1 inline-block rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-medium text-gold-700">
                                                        {partner.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {partner.description && (
                                            <p className="mt-4 text-sm leading-relaxed text-ink-500">
                                                {partner.description}
                                            </p>
                                        )}
                                        {partner.website && (
                                            <a
                                                href={partner.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800"
                                            >
                                                Visiter le site{' '}
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    <Reveal className="mt-16 flex flex-col items-center gap-4 rounded-2xl bg-ink-50 px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
                        <div className="flex items-center gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-900">
                                <Handshake className="h-6 w-6 text-gold-400" />
                            </span>
                            <div>
                                <h3 className="font-serif text-lg font-bold text-ink-900">
                                    Devenir partenaire de l'EEHT
                                </h3>
                                <p className="mt-1 text-sm text-ink-500">
                                    Vous représentez une entreprise du secteur
                                    et souhaitez collaborer avec nous ?
                                </p>
                            </div>
                        </div>
                        <a
                            href={route('pages.contact')}
                            className="shrink-0 rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400"
                        >
                            Nous contacter
                        </a>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
}

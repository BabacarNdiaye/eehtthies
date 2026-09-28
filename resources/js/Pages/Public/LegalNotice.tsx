import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h2 className="mb-3 font-serif text-xl font-bold text-ink-900">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-ink-600">{children}</div>
        </div>
    );
}

export default function LegalNotice() {
    const { siteSettings } = usePage<PageProps>().props;

    return (
        <PublicLayout>
            <Head title="Mentions légales" />
            <PageHero eyebrow="Informations légales" title="Mentions légales" />

            <section className="bg-white py-16 sm:py-20">
                <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <Section title="Éditeur du site">
                        <p>
                            Le présent site est édité par l'<strong>{siteSettings.site_name}</strong>
                            {siteSettings.site_address ? `, dont le siège est situé ${siteSettings.site_address}` : ''}.
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            {siteSettings.site_email && <li>E-mail : {siteSettings.site_email}</li>}
                            {siteSettings.site_phone && <li>Téléphone : {siteSettings.site_phone}</li>}
                            {siteSettings.director_name && (
                                <li>
                                    Directeur de la publication : {siteSettings.director_name}
                                    {siteSettings.director_role ? ` (${siteSettings.director_role})` : ''}
                                </li>
                            )}
                        </ul>
                    </Section>

                    <Section title="Hébergement">
                        <p>
                            Ce site est hébergé par un prestataire d'hébergement web. Les coordonnées complètes de
                            l'hébergeur peuvent être obtenues sur simple demande auprès de l'établissement, aux
                            coordonnées indiquées ci-dessus.
                        </p>
                    </Section>

                    <Section title="Propriété intellectuelle">
                        <p>
                            L'ensemble des contenus présents sur ce site (textes, images, logos, mise en page,
                            identité visuelle) est la propriété de l'{siteSettings.site_name}, sauf mention contraire.
                            Toute reproduction, représentation, modification ou diffusion, totale ou partielle, sans
                            autorisation préalable est interdite.
                        </p>
                    </Section>

                    <Section title="Responsabilité">
                        <p>
                            L'établissement s'efforce d'assurer l'exactitude et la mise à jour des informations
                            diffusées sur ce site, mais ne peut garantir l'absence d'erreur ou d'omission. L'
                            {siteSettings.site_name} ne saurait être tenu responsable des dommages directs ou
                            indirects résultant de l'accès ou de l'utilisation de ce site.
                        </p>
                    </Section>

                    <Section title="Liens externes">
                        <p>
                            Ce site peut contenir des liens vers des sites tiers (réseaux sociaux, partenaires). L'
                            {siteSettings.site_name} n'exerce aucun contrôle sur ces sites et décline toute
                            responsabilité quant à leur contenu.
                        </p>
                    </Section>

                    <Section title="Droit applicable">
                        <p>
                            Les présentes mentions légales sont soumises au droit sénégalais. Tout litige relatif à
                            leur interprétation ou leur exécution relève de la compétence des juridictions sénégalaises.
                        </p>
                    </Section>

                    <Section title="Contact">
                        <p>
                            Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter
                            {siteSettings.site_email ? ` à l'adresse ${siteSettings.site_email}` : ''} ou via notre{' '}
                            <a href={route('pages.contact')} className="text-brand-600 underline">
                                formulaire de contact
                            </a>
                            .
                        </p>
                    </Section>
                </Reveal>
            </section>
        </PublicLayout>
    );
}

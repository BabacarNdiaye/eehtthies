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

export default function PrivacyPolicy() {
    const { siteSettings } = usePage<PageProps>().props;

    return (
        <PublicLayout>
            <Head title="Politique de confidentialité" />
            <PageHero
                eyebrow="Vos données"
                title="Politique de confidentialité"
                subtitle="Comment l'EEHT de Thiès collecte, utilise et protège vos données personnelles."
            />

            <section className="bg-white py-16 sm:py-20">
                <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <p className="mb-8 text-sm leading-relaxed text-ink-500">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                        L'{siteSettings.site_name} attache une grande importance à la protection de vos données
                        personnelles. Cette page explique quelles données nous collectons, pourquoi, et quels droits
                        vous pouvez exercer.
                    </p>

                    <Section title="1. Responsable du traitement">
                        <p>
                            Le responsable du traitement des données collectées via ce site et la plateforme de
                            gestion associée est l'<strong>{siteSettings.site_name}</strong>
                            {siteSettings.site_address ? `, situé ${siteSettings.site_address}` : ''}.
                            {siteSettings.site_email && (
                                <> Pour toute question, contactez-nous à {siteSettings.site_email}.</>
                            )}
                        </p>
                    </Section>

                    <Section title="2. Données que nous collectons">
                        <p>Selon votre relation avec l'établissement, nous pouvons collecter :</p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                <strong>Candidats</strong> : identité, coordonnées, parcours scolaire et documents
                                fournis lors d'une candidature en ligne.
                            </li>
                            <li>
                                <strong>Élèves</strong> : identité, coordonnées, informations de scolarité (formation,
                                classe, notes, présences, bulletins), coordonnées d'un tuteur légal, et — avec votre
                                consentement — des informations de santé (groupe sanguin, allergies, conditions
                                chroniques, traitements) conservées uniquement à des fins de sécurité en cas
                                d'urgence.
                            </li>
                            <li>
                                <strong>Personnel</strong> : identité, coordonnées professionnelles et personnelles,
                                fonction, et informations liées à la gestion administrative et salariale.
                            </li>
                            <li>
                                <strong>Visiteurs du site</strong> : informations transmises via le formulaire de
                                contact (nom, e-mail, téléphone, message).
                            </li>
                            <li>
                                <strong>Comptes d'accès</strong> (espaces élève, enseignant, parent, personnel) :
                                adresse e-mail et mot de passe (stocké de façon chiffrée, jamais en clair).
                            </li>
                        </ul>
                    </Section>

                    <Section title="3. Pourquoi nous utilisons ces données">
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Instruire les candidatures et gérer les inscriptions ;</li>
                            <li>Assurer le suivi pédagogique, administratif et financier des élèves ;</li>
                            <li>Assurer la sécurité et la santé des élèves en cas d'urgence ;</li>
                            <li>Gérer les comptes du personnel et la vie administrative de l'école ;</li>
                            <li>Répondre à vos demandes envoyées via le formulaire de contact ;</li>
                            <li>Respecter nos obligations légales, comptables et réglementaires.</li>
                        </ul>
                        <p>Nous ne vendons ni ne louons vos données personnelles à des tiers.</p>
                    </Section>

                    <Section title="4. Qui a accès à vos données">
                        <p>
                            L'accès aux données au sein de notre plateforme de gestion est strictement limité au
                            personnel habilité, selon un système de rôles et permissions : seules les personnes dont
                            la fonction le justifie (par exemple le personnel pédagogique pour les notes, le personnel
                            comptable pour les données financières) peuvent consulter les informations correspondantes.
                        </p>
                    </Section>

                    <Section title="5. Durée de conservation">
                        <p>
                            Vos données sont conservées pendant la durée nécessaire aux finalités décrites ci-dessus,
                            puis archivées ou supprimées conformément aux obligations légales applicables aux
                            établissements d'enseignement au Sénégal (notamment en matière de conservation des
                            dossiers scolaires et comptables).
                        </p>
                    </Section>

                    <Section title="6. Sécurité des données">
                        <p>
                            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos
                            données : accès restreint par rôles et permissions, mots de passe chiffrés, connexions
                            sécurisées, et sauvegardes régulières de la base de données.
                        </p>
                    </Section>

                    <Section title="7. Cookies et stockage local">
                        <p>
                            Ce site utilise le stockage local de votre navigateur uniquement pour améliorer votre
                            expérience (par exemple, mémoriser que vous avez déjà vu la proposition d'installation de
                            l'application). Nous n'utilisons pas de cookies publicitaires ou de traceurs tiers à des
                            fins commerciales.
                        </p>
                    </Section>

                    <Section title="8. Vos droits">
                        <p>
                            Conformément à la loi n° 2008-12 du 25 janvier 2008 sur la protection des données à
                            caractère personnel et aux textes réglementaires applicables au Sénégal, vous disposez
                            d'un droit d'accès, de rectification, d'opposition et de suppression de vos données
                            personnelles. Pour exercer ces droits, contactez-nous
                            {siteSettings.site_email ? ` à ${siteSettings.site_email}` : ''} ou via notre{' '}
                            <a href={route('pages.contact')} className="text-brand-600 underline">
                                formulaire de contact
                            </a>
                            . Vous pouvez également adresser une réclamation à la Commission de Protection des
                            Données Personnelles (CDP) du Sénégal.
                        </p>
                    </Section>

                    <Section title="9. Modifications de cette politique">
                        <p>
                            Cette politique de confidentialité peut être mise à jour périodiquement. La date de
                            dernière mise à jour figure en haut de cette page.
                        </p>
                    </Section>
                </Reveal>
            </section>
        </PublicLayout>
    );
}

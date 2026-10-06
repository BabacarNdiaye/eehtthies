import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import SectionHeading from '@/Components/Public/SectionHeading';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ChefHat,
    Compass,
    GraduationCap,
    Heart,
    Quote,
    Sparkles,
    Target,
    UtensilsCrossed,
    Wine,
} from 'lucide-react';

const values = [
    {
        icon: Target,
        title: 'Notre mission',
        text: "Former des professionnels compétents, rigoureux et passionnés, capables de répondre aux exigences des métiers de l'hôtellerie, de la restauration et du tourisme, au Sénégal comme à l'international.",
    },
    {
        icon: Compass,
        title: 'Notre vision',
        text: "Devenir la référence ouest-africaine de la formation hôtelière et touristique, en conjuguant excellence académique, savoir-faire pratique et rayonnement international.",
    },
    {
        icon: Heart,
        title: 'Nos valeurs',
        text: "Excellence, rigueur, sens du service, esprit d'équipe et ouverture sur le monde : des valeurs que nous transmettons à chaque étudiant, en salle de classe comme en atelier.",
    },
];

const highlights = [
    {
        icon: ChefHat,
        title: "Ateliers de cuisine professionnels",
        text: 'Des cuisines pédagogiques équipées aux normes professionnelles pour une pratique intensive.',
    },
    {
        icon: UtensilsCrossed,
        title: "Restaurant d'application",
        text: 'Un restaurant pédagogique où nos étudiants mettent en pratique le service et l\'art de la table.',
    },
    {
        icon: Wine,
        title: 'Atelier bar & sommellerie',
        text: "Initiation aux techniques de bar, d'œnologie et de service des vins.",
    },
    {
        icon: GraduationCap,
        title: 'Salles de classe modernes',
        text: 'Des espaces théoriques confortables, équipés pour un apprentissage optimal.',
    },
];

export default function About() {
    const { siteSettings } = usePage<PageProps>().props;
    const directorPhoto = siteSettings.director_photo ? `/storage/${siteSettings.director_photo}` : null;
    const directorName = siteSettings.director_name || 'La Direction de l\'EEHT de Thiès';
    const directorRole = siteSettings.director_role;
    const directorMessage =
        siteSettings.director_message ||
        `Chers étudiants, chers parents, chers partenaires, bienvenue à l'EEHT de Thiès. Depuis sa création, notre établissement s'est donné pour mission de préparer des professionnels d'excellence pour les métiers de l'hôtellerie, de la restauration et du tourisme — des secteurs en plein essor au Sénégal et dans la sous-région.

Nous croyons profondément que la réussite de nos étudiants repose sur un équilibre entre exigence académique, pratique intensive et accompagnement humain. C'est cette conviction qui anime chaque jour notre équipe pédagogique et administrative.

Je vous invite à découvrir notre école, nos formations et notre engagement pour votre avenir.`;

    return (
        <PublicLayout>
            <Head title="À propos - EEHT de Thiès" />

            <PageHero
                eyebrow="Découvrir l'EEHT"
                title="À propos de l'EEHT de Thiès"
                subtitle="L'Elite École Hôtelière et Touristique de Thiès forme depuis de nombreuses années les talents de demain dans les métiers de l'hôtellerie, de la restauration et du tourisme."
            />

            {/* Mot de la direction */}
            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Un message de la direction"
                            title="Mot du Directeur"
                        />
                    </Reveal>
                    <Reveal delay={100} className="mt-10 grid grid-cols-1 gap-8 rounded-2xl bg-ink-50 p-8 sm:p-12 md:grid-cols-[auto,1fr] md:items-start">
                        <div className="mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-full ring-4 ring-white md:mx-0">
                            {directorPhoto ? (
                                <img
                                    src={directorPhoto}
                                    alt={directorName}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <ImagePlaceholder className="h-full w-full" label={directorName.charAt(0)} />
                            )}
                        </div>
                        <div className="relative">
                            <Quote className="h-10 w-10 text-gold-300" />
                            <p className="mt-4 whitespace-pre-line text-lg italic leading-relaxed text-ink-700">
                                « {directorMessage} »
                            </p>
                            <p className="mt-6 font-serif text-base font-bold text-ink-900">{directorName}</p>
                            {directorRole && <p className="text-sm text-ink-500">{directorRole}</p>}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Mission / Vision / Valeurs */}
            <section className="bg-ink-50 py-12 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Ce qui nous anime"
                            title="Mission, vision & valeurs"
                        />
                    </Reveal>
                    <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
                        {values.map((value, i) => (
                            <Reveal key={value.title} delay={i * 80}>
                                <div className="h-full rounded-2xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900">
                                        <value.icon className="h-6 w-6 text-gold-400" />
                                    </span>
                                    <h3 className="mt-5 font-serif text-lg font-bold text-ink-900">
                                        {value.title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-relaxed text-ink-500">
                                        {value.text}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Notre histoire */}
            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Notre parcours"
                            title="Notre histoire"
                            align="left"
                        />
                    </Reveal>
                    <Reveal delay={100} className="mt-8 space-y-5 text-base leading-relaxed text-ink-600">
                        <p>
                            L'EEHT de Thiès est née de la volonté de répondre
                            à un besoin criant en professionnels qualifiés
                            dans les métiers de l'hôtellerie, de la
                            restauration et du tourisme, secteurs
                            stratégiques pour l'économie sénégalaise.
                        </p>
                        <p>
                            Depuis sa création, l'école a formé des centaines
                            d'étudiants, aujourd'hui présents dans les plus
                            grands hôtels, restaurants et agences de voyage
                            du pays et de la sous-région. Cette réussite
                            repose sur un modèle pédagogique unique, alliant
                            théorie rigoureuse et pratique intensive au sein
                            de nos infrastructures dédiées.
                        </p>
                        <p>
                            Année après année, l'EEHT de Thiès continue
                            d'investir dans ses équipements, de renforcer ses
                            partenariats avec les professionnels du secteur
                            et d'enrichir son offre de formation, pour rester
                            fidèle à sa vocation : former l'élite de demain.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* Infrastructures */}
            <section className="bg-ink-900 py-12 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Nos infrastructures"
                            title="Des espaces pensés pour la pratique"
                            subtitle="Nos infrastructures reproduisent les conditions réelles des métiers de l'hôtellerie et de la restauration, pour une formation résolument professionnalisante."
                            dark
                        />
                    </Reveal>
                    <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {highlights.map((item, i) => (
                            <Reveal key={item.title} delay={i * 80}>
                                <div className="h-full rounded-2xl bg-white/5 p-7 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500/15">
                                        <item.icon className="h-5 w-5 text-gold-400" />
                                    </span>
                                    <h3 className="mt-5 font-serif text-base font-bold text-white">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-300">
                                        {item.text}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-12 sm:py-24">
                <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-2xl bg-gold-50 px-8 py-14 text-center">
                    <Sparkles className="h-8 w-8 text-gold-600" />
                    <h2 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                        Prêt à rejoindre l'EEHT de Thiès ?
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-ink-600">
                        Découvrez nos formations et déposez votre candidature
                        en ligne dès aujourd'hui.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={route('formations.index')}
                            className="rounded-full bg-ink-900 px-7 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink-800"
                        >
                            Voir nos formations
                        </Link>
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full bg-gold-500 px-7 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400"
                        >
                            Candidater maintenant
                        </Link>
                    </div>
                </Reveal>
            </section>
        </PublicLayout>
    );
}

import FormationCard from '@/Components/Public/FormationCard';
import HeroSlider from '@/Components/Public/HeroSlider';
import ImagePlaceholder, { PatternOverlay } from '@/Components/Public/ImagePlaceholder';
import NewsCard from '@/Components/Public/NewsCard';
import QuickActions from '@/Components/Public/QuickActions';
import Reveal from '@/Components/Public/Reveal';
import SectionHeading from '@/Components/Public/SectionHeading';
import SnapCarousel from '@/Components/Public/SnapCarousel';
import StarRating from '@/Components/Public/StarRating';
import PublicLayout from '@/Layouts/PublicLayout';
import { initials, storageUrl } from '@/lib/publicFormat';
import { Formation, GalleryMediaItem, NewsArticle, PageProps, Partner, Slider, Testimonial } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Briefcase,
    Building2,
    Camera,
    ChefHat,
    ChevronRight,
    Facebook,
    GraduationCap,
    Handshake,
    Heart,
    Quote,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Compteur de statistiques                                                        */
/* ------------------------------------------------------------------ */

function StatCounter({
    value,
    suffix = '',
    label,
    icon: Icon,
    tone = 'dark',
    accent = 'gold',
}: {
    value: string;
    suffix?: string;
    label: string;
    icon?: typeof Award;
    tone?: 'dark' | 'light';
    accent?: 'gold' | 'brand' | 'leaf';
}) {
    const target = parseInt(value, 10) || 0;
    const [count, setCount] = useState(0);

    useEffect(() => {
        // Préférence « moins d'animations » : le chiffre final s'affiche tout de suite.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setCount(target);
            return;
        }

        let start: number | null = null;
        const duration = 1200;
        let raf: number;

        const step = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) {
                raf = requestAnimationFrame(step);
            } else {
                setCount(target);
            }
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target]);

    const isLight = tone === 'light';
    const accentBadge = {
        gold: 'bg-gold-50 text-gold-600',
        brand: 'bg-brand-50 text-brand-600',
        leaf: 'bg-leaf-50 text-leaf-700',
    }[accent];
    const accentBadgeDark = {
        gold: 'bg-gold-400/15 text-gold-400',
        brand: 'bg-brand-400/20 text-brand-300',
        leaf: 'bg-leaf-400/20 text-leaf-300',
    }[accent];
    const accentNumberDark = {
        gold: 'text-gold-400',
        brand: 'text-brand-300',
        leaf: 'text-leaf-300',
    }[accent];

    return (
        <div className="flex flex-col items-center text-center">
            {Icon && (
                <span
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
                        isLight ? accentBadge : accentBadgeDark
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </span>
            )}
            <div
                className={`font-serif text-3xl font-bold sm:text-4xl ${
                    isLight ? 'text-ink-900' : accentNumberDark
                }`}
            >
                {count}
                {suffix}
            </div>
            <div
                className={`mt-1.5 text-xs font-medium uppercase tracking-widest sm:text-sm ${
                    isLight ? 'text-ink-500' : 'text-ink-300'
                }`}
            >
                {label}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Bandeau de statistiques — bande pleine largeur, directement sous le hero        */
/* ------------------------------------------------------------------ */

const statColumns: Record<number, string> = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
};

function StatsBanner({
    stats,
}: {
    stats: {
        years_experience: string;
        students_trained: string;
        success_rate: string;
        partners_count: string;
    };
}) {
    // Une statistique à zéro (aucun partenaire publié, par exemple) ferait mauvais effet : on ne l'affiche pas.
    const items = [
        { icon: Award, accent: 'gold', value: stats.years_experience, suffix: '+', label: "Années d'expérience" },
        { icon: Users, accent: 'brand', value: stats.students_trained, suffix: '+', label: 'Étudiants formés' },
        { icon: TrendingUp, accent: 'leaf', value: stats.success_rate, suffix: '%', label: 'Taux de réussite' },
        { icon: Handshake, accent: 'brand', value: stats.partners_count, suffix: '+', label: 'Partenaires' },
    ] as const;
    const visible = items.filter((item) => (parseInt(item.value, 10) || 0) > 0);

    if (visible.length === 0) return null;

    // Nombre impair : sur téléphone (2 colonnes), la dernière statistique occupe toute la largeur plutôt que de laisser un trou.
    const oddCount = visible.length % 2 === 1;

    return (
        <div className="bg-white pt-3 sm:pt-0">
            <Reveal>
                <div
                    className={`mx-auto grid max-w-6xl grid-cols-2 divide-y divide-ink-100 px-4 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8 ${statColumns[visible.length]}`}
                >
                    {visible.map((item, i) => (
                        <div key={item.label} className={`py-5 sm:px-6 sm:py-10 ${oddCount && i === visible.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
                            <StatCounter icon={item.icon} tone="light" accent={item.accent} value={item.value} suffix={item.suffix} label={item.label} />
                        </div>
                    ))}
                </div>
            </Reveal>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const features = [
    {
        icon: GraduationCap,
        title: 'Formation professionnalisante',
        text: 'Des cursus conçus avec les professionnels du secteur pour répondre aux réalités du terrain.',
        tone: 'gold',
    },
    {
        icon: Users,
        title: 'Encadrement qualifié',
        text: 'Une équipe pédagogique expérimentée, issue des métiers de l\'hôtellerie et du tourisme.',
        tone: 'brand',
    },
    {
        icon: BookOpen,
        title: 'Théorie + pratique',
        text: "Un équilibre pensé entre enseignement académique et mise en situation professionnelle.",
        tone: 'leaf',
    },
    {
        icon: ChefHat,
        title: 'Ateliers professionnels',
        text: 'Cuisines, restaurant d\'application et bar pédagogique aux normes du secteur.',
        tone: 'gold',
    },
    {
        icon: Building2,
        title: 'Infrastructures adaptées',
        text: "Des espaces modernes conçus pour reproduire les conditions réelles des métiers visés.",
        tone: 'brand',
    },
    {
        icon: Briefcase,
        title: 'Insertion professionnelle',
        text: "Un accompagnement actif vers l'emploi et les stages en entreprise.",
        tone: 'leaf',
    },
    {
        icon: Handshake,
        title: 'Partenariats',
        text: 'Un réseau d\'hôtels, restaurants et agences partenaires pour vos stages et votre carrière.',
        tone: 'gold',
    },
    {
        icon: Heart,
        title: 'Accompagnement des élèves',
        text: 'Un suivi personnalisé de chaque étudiant, de l\'admission jusqu\'à la diplomation.',
        tone: 'brand',
    },
] as const;

const featureToneClasses: Record<string, string> = {
    gold: 'bg-gold-50 text-gold-600 group-hover:bg-gold-500 group-hover:text-ink-900',
    brand: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white',
    leaf: 'bg-leaf-50 text-leaf-700 group-hover:bg-leaf-500 group-hover:text-ink-900',
};

export default function Home({
    sliders,
    formations,
    news,
    testimonials,
    partners,
    galleryPreview,
    stats,
}: {
    sliders: Slider[];
    formations: Formation[];
    news: NewsArticle[];
    testimonials: Testimonial[];
    partners: Partner[];
    galleryPreview: GalleryMediaItem[];
    stats: {
        years_experience: string;
        students_trained: string;
        success_rate: string;
        partners_count: string;
    };
}) {
    const { siteSettings } = usePage<PageProps>().props;
    const aboutPhoto = storageUrl(siteSettings.about_photo);

    return (
        <PublicLayout>
            <Head title="EEHT de Thiès - Elite École Hôtelière et Touristique" />

            <HeroSlider sliders={sliders} />
            <QuickActions />
            <StatsBanner stats={stats} />

            {/* Présentation rapide + points forts */}
            <section className="bg-ink-900 py-12 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
                        {/* Sans photo, ce bloc n'est qu'un cadre vide : on ne le montre pas sur téléphone. */}
                        <Reveal className={`relative ${aboutPhoto ? '' : 'hidden lg:block'}`}>
                            <div
                                className="relative aspect-[4/3] w-full max-w-md overflow-hidden bg-ink-800 lg:aspect-[4/5]"
                                style={{
                                    clipPath:
                                        'polygon(0 0, 100% 0, 100% 92%, 88% 100%, 0 100%)',
                                }}
                            >
                                {aboutPhoto ? (
                                    <img
                                        src={aboutPhoto}
                                        alt="Étudiants de l'EEHT de Thiès"
                                        loading="lazy"
                                        decoding="async"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImagePlaceholder className="h-full w-full" icon={GraduationCap} />
                                )}
                            </div>
                            <span className="absolute left-0 top-0 h-1.5 w-24 bg-gradient-to-r from-gold-400 via-brand-500 to-leaf-400" />
                            <div className="absolute -bottom-6 -right-4 max-w-[220px] bg-white p-5 shadow-2xl sm:-right-8">
                                <div className="font-serif text-3xl font-bold text-brand-700">
                                    {stats.years_experience}+
                                </div>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                                    Années au service de l'excellence hôtelière
                                </p>
                            </div>
                        </Reveal>

                        <div className="lg:pl-6">
                            <Reveal delay={80}>
                                <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                                    Bienvenue à l'EEHT de Thiès
                                </span>
                                <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
                                    Former l'élite de l'hôtellerie, de la
                                    restauration et du tourisme
                                </h2>
                                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-300">
                                    <p>
                                        L'Elite École Hôtelière et Touristique de
                                        Thiès accompagne chaque étudiant vers
                                        l'excellence professionnelle, à travers
                                        des formations exigeantes, ancrées dans
                                        la pratique et portées par une équipe
                                        pédagogique passionnée.
                                    </p>
                                    <p>
                                        Notre pédagogie repose sur un principe
                                        simple : apprendre en faisant. Cuisine,
                                        salle, réception, agence de voyage —
                                        chaque discipline est enseignée dans des
                                        conditions proches de la réalité
                                        professionnelle.
                                    </p>
                                </div>
                                <Link
                                    href={route('pages.about')}
                                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200"
                                >
                                    Découvrir l'école
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Reveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* Formations showcase */}
            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Nos cursus"
                            title="Nos formations"
                            subtitle="Des parcours diplômants dans les métiers de l'hôtellerie, de la restauration et du tourisme, pensés pour une insertion professionnelle rapide et durable."
                        />
                    </Reveal>

                    {formations.length === 0 ? (
                        <p className="mt-10 text-center text-ink-500 sm:mt-14">
                            Nos formations seront bientôt présentées ici.
                        </p>
                    ) : (
                        <Reveal className="mt-10 sm:mt-14">
                            <SnapCarousel label="Nos formations" gridClassName="sm:grid sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
                                {formations.map((formation) => (
                                    <FormationCard key={formation.id} formation={formation} />
                                ))}
                            </SnapCarousel>
                        </Reveal>
                    )}

                    <div className="mt-8 text-center sm:mt-12">
                        <Link
                            href={route('formations.index')}
                            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                        >
                            Voir toutes nos formations
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pourquoi choisir l'EEHT */}
            <section className="bg-ink-50 py-12 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Notre différence"
                            title={"Pourquoi choisir l'EEHT ?"}
                            subtitle="Un modèle de formation exigeant, pensé pour préparer nos étudiants aux réalités des métiers de l'hôtellerie et du tourisme."
                        />
                    </Reveal>

                    <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-6 lg:grid-cols-4">
                        {features.map((feature, i) => (
                            <Reveal key={feature.title} delay={i * 60}>
                                <div className="group h-full rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-1.5 hover:shadow-2xl sm:p-7">
                                    <span
                                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors sm:h-11 sm:w-11 ${featureToneClasses[feature.tone]}`}
                                    >
                                        <feature.icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="mt-4 font-serif text-sm font-bold leading-snug text-ink-900 sm:mt-5 sm:text-base">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-500 sm:mt-2 sm:line-clamp-none sm:text-sm">
                                        {feature.text}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Actualités & Facebook */}
            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Vie de l'école"
                            title="Actualités & vie de l'école"
                            subtitle="Restez informés des événements, réussites et temps forts de la vie étudiante à l'EEHT de Thiès."
                        />
                    </Reveal>

                    {news.length === 0 ? (
                        <p className="mt-10 text-center text-ink-500 sm:mt-14">
                            Aucune actualité publiée pour le moment.
                        </p>
                    ) : (
                        <Reveal className="mt-10 sm:mt-14">
                            <SnapCarousel label="Dernières actualités" gridClassName="sm:grid sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
                                {news.map((article) => (
                                    <NewsCard key={article.id} article={article} />
                                ))}
                            </SnapCarousel>
                        </Reveal>
                    )}

                    {siteSettings.facebook_url && (
                        <div className="mt-10 flex flex-col items-center gap-5 rounded-2xl bg-[#1565d8] px-8 py-10 text-center sm:mt-14 sm:flex-row sm:justify-between sm:text-left">
                            <div className="flex items-center gap-4">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                                    <Facebook className="h-7 w-7 text-white" />
                                </span>
                                <div>
                                    <h3 className="font-serif text-lg font-bold text-white">
                                        Suivez-nous sur Facebook
                                    </h3>
                                    <p className="mt-1 text-sm text-white">
                                        Ne manquez aucune actualité, photo ou
                                        événement de l'école.
                                    </p>
                                </div>
                            </div>
                            <a
                                href={siteSettings.facebook_url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1565d8] shadow-soft transition hover:bg-white/90"
                            >
                                Voir notre page
                            </a>
                        </div>
                    )}
                </div>
            </section>

            {/* Témoignages : la section n'apparaît que lorsqu'il y en a (une section vide occupait tout un écran) */}
            {testimonials.length > 0 && (
                <section className="bg-ink-50 py-12 sm:py-24">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <SectionHeading
                                eyebrow="Ils témoignent"
                                title="Ce qu'ils disent de nous"
                                subtitle="Étudiants, diplômés et partenaires partagent leur expérience à l'EEHT de Thiès."
                            />
                        </Reveal>

                        <Reveal className="mt-10 sm:mt-14">
                            <SnapCarousel label="Témoignages" focusable gridClassName="sm:grid sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
                                {testimonials.map((testimonial) => {
                                    const photo = storageUrl(testimonial.photo);
                                    return (
                                        <div
                                            key={testimonial.id}
                                            className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
                                        >
                                            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-400 via-brand-400 to-leaf-400" />
                                            <Quote className="h-6 w-6 text-gold-200" />
                                            <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-ink-600">
                                                « {testimonial.content} »
                                            </p>
                                            <StarRating
                                                rating={testimonial.rating}
                                                className="mt-4"
                                            />
                                            <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
                                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
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
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-ink-900">
                                                        {testimonial.name}
                                                    </div>
                                                    <div className="truncate text-xs text-ink-500">
                                                        {testimonial.role}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </SnapCarousel>
                        </Reveal>
                    </div>
                </section>
            )}

            {/* Aperçu de la galerie */}
            {galleryPreview.length > 0 && (
                <section className="py-12 sm:py-24">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <SectionHeading
                                    align="left"
                                    eyebrow="En images"
                                    title="L'EEHT en images"
                                    subtitle="Ateliers, événements et vie étudiante au sein de notre établissement."
                                />
                                <Link
                                    href={route('gallery.index')}
                                    className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                                >
                                    <Camera className="h-4 w-4" />
                                    Voir toute la galerie
                                </Link>
                            </div>
                        </Reveal>

                        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4">
                            {galleryPreview.map((item, i) => {
                                const image = storageUrl(item.path);
                                return (
                                    <Reveal key={item.id} delay={i * 60}>
                                        <Link
                                            href={route('gallery.index')}
                                            className="group block aspect-square overflow-hidden rounded-xl"
                                        >
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={item.caption ?? "Photo de l'EEHT de Thiès"}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <ImagePlaceholder className="h-full w-full" icon={Camera} />
                                            )}
                                        </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Bandeau des partenaires */}
            {partners.length > 0 && (
                <section className="py-12 sm:py-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-ink-500">
                            Ils nous font confiance
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                            {partners.map((partner) => {
                                const logo = storageUrl(partner.logo);
                                return (
                                    <div
                                        key={partner.id}
                                        className="flex items-center gap-2 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                                    >
                                        {logo ? (
                                            <img
                                                src={logo}
                                                alt={partner.name}
                                                loading="lazy"
                                                className="h-10 w-auto object-contain"
                                            />
                                        ) : (
                                            <span className="flex h-10 items-center rounded-full bg-ink-50 px-4 text-sm font-semibold text-ink-600">
                                                {partner.name}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Appel à l'action final */}
            <section className="relative overflow-hidden bg-ink-950 py-12 sm:py-24">
                <PatternOverlay />
                <div
                    className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl"
                    aria-hidden
                />
                <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
                    <Sparkles className="mx-auto h-9 w-9 text-gold-400" />
                    <h2 className="mt-6 font-serif text-3xl font-bold text-white sm:text-4xl">
                        Prêt à écrire votre avenir avec l'EEHT de Thiès&nbsp;?
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
                        Rejoignez une école qui allie exigence académique et
                        excellence professionnelle. Déposez votre
                        candidature ou contactez notre équipe pour en savoir
                        plus.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:bg-gold-400"
                        >
                            Candidater maintenant
                        </Link>
                        <Link
                            href={route('pages.contact')}
                            className="rounded-full border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            Nous contacter
                        </Link>
                    </div>
                </Reveal>
            </section>
        </PublicLayout>
    );
}

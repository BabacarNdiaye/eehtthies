import PublicLayout from '@/Layouts/PublicLayout';
import SectionHeading from '@/Components/Public/SectionHeading';
import ImagePlaceholder, {
    PatternOverlay,
} from '@/Components/Public/ImagePlaceholder';
import StarRating from '@/Components/Public/StarRating';
import Reveal from '@/Components/Public/Reveal';
import { Formation, GalleryMediaItem, NewsArticle, PageProps, Partner, Slider, Testimonial } from '@/types';
import { formatDateLong, initials, storageUrl } from '@/lib/publicFormat';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Briefcase,
    Building2,
    Camera,
    ChefHat,
    ChevronLeft,
    ChevronRight,
    Facebook,
    GraduationCap,
    Handshake,
    Heart,
    Newspaper,
    Quote,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Stat counter                                                        */
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
                    isLight ? 'text-ink-400' : 'text-ink-300'
                }`}
            >
                {label}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Stats banner — flat, full-width strip directly under the hero        */
/* ------------------------------------------------------------------ */

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
    return (
        <div className="bg-white">
            <Reveal>
                <div className="mx-auto grid max-w-6xl grid-cols-2 divide-y divide-ink-100 px-4 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
                    <div className="py-8 sm:px-6 sm:py-10">
                        <StatCounter
                            icon={Award}
                            tone="light"
                            accent="gold"
                            value={stats.years_experience}
                            suffix="+"
                            label="Années d'expérience"
                        />
                    </div>
                    <div className="py-8 sm:px-6 sm:py-10">
                        <StatCounter
                            icon={Users}
                            tone="light"
                            accent="brand"
                            value={stats.students_trained}
                            suffix="+"
                            label="Étudiants formés"
                        />
                    </div>
                    <div className="py-8 sm:px-6 sm:py-10">
                        <StatCounter
                            icon={TrendingUp}
                            tone="light"
                            accent="leaf"
                            value={stats.success_rate}
                            suffix="%"
                            label="Taux de réussite"
                        />
                    </div>
                    <div className="py-8 sm:px-6 sm:py-10">
                        <StatCounter
                            icon={Handshake}
                            tone="light"
                            accent="brand"
                            value={stats.partners_count}
                            suffix="+"
                            label="Partenaires"
                        />
                    </div>
                </div>
            </Reveal>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Hero slider                                                          */
/* ------------------------------------------------------------------ */

function HeroSlider({ sliders }: { sliders: Slider[] }) {
    const [index, setIndex] = useState(0);
    const count = sliders.length;

    useEffect(() => {
        if (count <= 1) return;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % count);
        }, 6000);
        return () => clearInterval(id);
    }, [count]);

    if (count === 0) {
        return (
            <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-ink-950">
                <PatternOverlay />
                <div
                    className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-leaf-500/10 blur-3xl"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        Elite École Hôtelière et Touristique de Thiès
                    </span>
                    <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                        L'excellence au service de vos{' '}
                        <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-brand-300 bg-clip-text text-transparent">
                            ambitions hôtelières &amp; touristiques
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
                        Depuis de nombreuses années, l'EEHT de Thiès forme
                        les talents de demain dans l'hôtellerie, la
                        restauration et le tourisme, alliant excellence
                        académique et savoir-faire professionnel.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route('formations.index')}
                            className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg"
                        >
                            Découvrir nos formations
                        </Link>
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                        >
                            Candidater maintenant
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative min-h-[88vh] w-full overflow-hidden bg-ink-950">
            {sliders.map((slide, i) => {
                const image = storageUrl(slide.image);
                return (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ${
                            i === index ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        {image ? (
                            <img
                                src={image}
                                alt={slide.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-gradient-to-br from-ink-950 via-brand-900 to-ink-900" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-ink-950/30" />
                    </div>
                );
            })}

            <div className="relative flex min-h-[88vh] items-center">
                <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                    {sliders.map((slide, i) => (
                        <div
                            key={slide.id}
                            className={`transition-all duration-700 ${
                                i === index
                                    ? 'relative opacity-100'
                                    : 'absolute inset-0 opacity-0'
                            }`}
                        >
                            {i === index && (
                                <>
                                    <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 backdrop-blur">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        EEHT de Thiès
                                    </span>
                                    <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                                        {slide.title}
                                    </h1>
                                    {slide.subtitle && (
                                        <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-ink-200">
                                            {slide.subtitle}
                                        </p>
                                    )}
                                    {slide.button_text && slide.button_link && (
                                        <div className="mt-10">
                                            <Link
                                                href={slide.button_link}
                                                className="inline-flex rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg"
                                            >
                                                {slide.button_text}
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {count > 1 && (
                <>
                    <button
                        onClick={() =>
                            setIndex((i) => (i - 1 + count) % count)
                        }
                        aria-label="Diapositive précédente"
                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-8"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setIndex((i) => (i + 1) % count)}
                        aria-label="Diapositive suivante"
                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-8"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
                        {sliders.map((slide, i) => (
                            <button
                                key={slide.id}
                                onClick={() => setIndex(i)}
                                aria-label={`Aller à la diapositive ${i + 1}`}
                                className={`h-2 rounded-full transition-all ${
                                    i === index
                                        ? 'w-8 bg-gold-400'
                                        : 'w-2 bg-white/40 hover:bg-white/60'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
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
            <StatsBanner stats={stats} />

            {/* Quick presentation + highlights */}
            <section className="bg-ink-900 py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
                        <Reveal className="relative">
                            <div
                                className="relative aspect-[4/5] w-full max-w-md overflow-hidden bg-ink-800"
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
                            </Reveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* Formations showcase */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Nos cursus"
                            title="Nos formations"
                            subtitle="Des parcours diplômants dans les métiers de l'hôtellerie, de la restauration et du tourisme, pensés pour une insertion professionnelle rapide et durable."
                        />
                    </Reveal>

                    {formations.length === 0 ? (
                        <p className="mt-14 text-center text-ink-500">
                            Nos formations seront bientôt présentées ici.
                        </p>
                    ) : (
                        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {formations.map((formation, i) => {
                                const image = storageUrl(formation.image);
                                return (
                                    <Reveal key={formation.id} delay={i * 80}>
                                        <Link
                                            href={route(
                                                'formations.show',
                                                formation.slug,
                                            )}
                                            className="group flex h-full flex-col bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                                        >
                                            <div
                                                className="relative h-52 w-full overflow-hidden"
                                                style={{
                                                    clipPath:
                                                        'polygon(0 0, 100% 0, 100% 84%, 0 100%)',
                                                }}
                                            >
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={formation.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full"
                                                        label={initials(
                                                            formation.name,
                                                        )}
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
                                                {formation.diploma && (
                                                    <span className="absolute left-4 top-4 bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                                                        {formation.diploma}
                                                    </span>
                                                )}
                                                {formation.duration && (
                                                    <span className="absolute bottom-5 right-4 text-xs font-semibold uppercase tracking-wide text-white/90">
                                                        {formation.duration}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="h-1 w-full bg-gradient-to-r from-gold-400 via-brand-500 to-leaf-400" />
                                            <div className="flex flex-1 flex-col border-x border-b border-ink-100 p-7">
                                                <h3 className="font-serif text-xl font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
                                                    {formation.name}
                                                </h3>
                                                {formation.description && (
                                                    <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">
                                                        {formation.description}
                                                    </p>
                                                )}
                                                <span className="mt-6 inline-flex items-center gap-3 text-sm font-semibold text-ink-900">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white transition duration-300 group-hover:bg-brand-600 group-hover:rotate-45">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </span>
                                                    Voir la formation
                                                </span>
                                            </div>
                                        </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-12 text-center">
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
            <section className="bg-ink-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Notre différence"
                            title="Pourquoi choisir l'EEHT ?"
                            subtitle="Un modèle de formation exigeant, pensé pour préparer nos étudiants aux réalités des métiers de l'hôtellerie et du tourisme."
                        />
                    </Reveal>

                    <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature, i) => (
                            <Reveal key={feature.title} delay={i * 60}>
                                <div className="group h-full rounded-2xl bg-white p-7 shadow-sm transition hover:-translate-y-1.5 hover:shadow-2xl">
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${featureToneClasses[feature.tone]}`}
                                    >
                                        <feature.icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="mt-5 font-serif text-base font-bold text-ink-900">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-500">
                                        {feature.text}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Actualités & Facebook */}
            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Vie de l'école"
                            title="Actualités & vie de l'école"
                            subtitle="Restez informés des événements, réussites et temps forts de la vie étudiante à l'EEHT de Thiès."
                        />
                    </Reveal>

                    {news.length === 0 ? (
                        <p className="mt-14 text-center text-ink-500">
                            Aucune actualité publiée pour le moment.
                        </p>
                    ) : (
                        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {news.map((article, i) => {
                                const image = storageUrl(article.image);
                                return (
                                    <Reveal key={article.id} delay={i * 80}>
                                        <Link
                                            href={route(
                                                'news.show',
                                                article.slug,
                                            )}
                                            className="group flex h-full flex-col bg-white shadow-sm transition hover:shadow-xl"
                                        >
                                            <div
                                                className="relative h-48 w-full overflow-hidden"
                                                style={{
                                                    clipPath:
                                                        'polygon(0 0, 100% 0, 100% 84%, 0 100%)',
                                                }}
                                            >
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={article.title}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full"
                                                        icon={Newspaper}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex flex-1 flex-col border-x border-b border-ink-100 p-6">
                                                <span className="h-0.5 w-10 bg-gold-500" />
                                                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                                                    <span className="text-brand-600">
                                                        {article.category ?? 'Actualité'}
                                                    </span>
                                                    <span className="text-ink-400">
                                                        {formatDateLong(
                                                            article.published_at,
                                                        )}
                                                    </span>
                                                </div>
                                                <h3 className="mt-3 font-serif text-lg font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
                                                    {article.title}
                                                </h3>
                                                {article.excerpt && (
                                                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">
                                                        {article.excerpt}
                                                    </p>
                                                )}
                                                <span className="mt-5 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-ink-900">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-600 transition group-hover:bg-gold-500 group-hover:text-ink-900">
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </span>
                                                    Lire la suite
                                                </span>
                                            </div>
                                        </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}

                    {siteSettings.facebook_url && (
                        <div className="mt-14 flex flex-col items-center gap-5 rounded-2xl bg-[#1877F2] px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
                            <div className="flex items-center gap-4">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                                    <Facebook className="h-7 w-7 text-white" />
                                </span>
                                <div>
                                    <h3 className="font-serif text-lg font-bold text-white">
                                        Suivez-nous sur Facebook
                                    </h3>
                                    <p className="mt-1 text-sm text-white/90">
                                        Ne manquez aucune actualité, photo ou
                                        événement de l'école.
                                    </p>
                                </div>
                            </div>
                            <a
                                href={siteSettings.facebook_url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1877F2] shadow-soft transition hover:bg-white/90"
                            >
                                Voir notre page
                            </a>
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-ink-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Ils témoignent"
                            title="Ce qu'ils disent de nous"
                            subtitle="Étudiants, diplômés et partenaires partagent leur expérience à l'EEHT de Thiès."
                        />
                    </Reveal>

                    {testimonials.length === 0 ? (
                        <p className="mt-14 text-center text-ink-500">
                            Les témoignages seront bientôt disponibles.
                        </p>
                    ) : (
                        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {testimonials.map((testimonial, i) => {
                                const photo = storageUrl(testimonial.photo);
                                return (
                                    <Reveal key={testimonial.id} delay={i * 80}>
                                        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
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
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Gallery preview */}
            {galleryPreview.length > 0 && (
                <section className="py-20 sm:py-24">
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

                        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

            {/* Partners strip */}
            {partners.length > 0 && (
                <section className="py-16">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">
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

            {/* Final CTA */}
            <section className="relative overflow-hidden bg-ink-950 py-20 sm:py-24">
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
                        Prêt à écrire votre avenir avec l'EEHT de Thiès ?
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

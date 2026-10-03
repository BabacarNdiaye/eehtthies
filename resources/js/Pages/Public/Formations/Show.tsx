import PublicLayout from '@/Layouts/PublicLayout';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import StarRating from '@/Components/Public/StarRating';
import Reveal from '@/Components/Public/Reveal';
import { Formation, PageProps, Testimonial } from '@/types';
import { formatDateLong, formatFcfa, initials, storageUrl } from '@/lib/publicFormat';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    BookOpen,
    Briefcase,
    CalendarClock,
    CheckCircle2,
    ChefHat,
    ClipboardCheck,
    Clock,
    GraduationCap,
    Mail,
    MapPin,
    ShieldCheck,
    Phone,
    Quote,
} from 'lucide-react';

type FormationDetail = Formation & {
    subjects: { id: number; name: string; coefficient: number }[];
    testimonials: Testimonial[];
};

function hasBulletMarkers(text?: string | null): text is string {
    return !!text && text.split('\n').some((l) => /^[•-]\s*/.test(l.trim()));
}

function parseBullets(text: string): string[] {
    return text
        .split('\n')
        .map((l) => l.trim().replace(/^[•-]\s*/, ''))
        .filter(Boolean);
}

type ProgramSection = { heading: string | null; items: string[] };

function parseProgramSections(text: string): ProgramSection[] {
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    const sections: ProgramSection[] = [];
    let current: ProgramSection | null = null;

    for (const line of lines) {
        if (/^[•-]\s*/.test(line)) {
            if (!current) {
                current = { heading: null, items: [] };
                sections.push(current);
            }
            current.items.push(line.replace(/^[•-]\s*/, ''));
        } else {
            current = { heading: line, items: [] };
            sections.push(current);
        }
    }

    return sections;
}

/** « 0.00 » signifie ici « non publié publiquement », et non « gratuit » — afficher un appel à nous contacter plutôt qu'un trompeur « 0 FCFA ». */
function feeLabel(value: string | number | null | undefined): string {
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return numeric ? formatFcfa(value) : 'Nous consulter';
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                {label}
            </div>
            <div className="mt-1 text-sm font-bold text-ink-900">{value}</div>
        </div>
    );
}

export default function FormationsShow({
    formation,
    others,
}: {
    formation: FormationDetail;
    others: Formation[];
}) {
    const { siteSettings } = usePage<PageProps>().props;
    const image = storageUrl(formation.image);

    const hasPresentation = !!formation.description || !!formation.objectives;
    const hasAdmission = !!formation.admission_conditions;
    const hasProgramme =
        !!formation.program || (formation.subjects && formation.subjects.length > 0);
    const hasDebouches = !!formation.career_prospects;
    const hasTemoignages = formation.testimonials && formation.testimonials.length > 0;

    const visibleTabs = [
        hasPresentation && { id: 'presentation', label: 'Présentation' },
        hasAdmission && { id: 'admission', label: 'Admission' },
        hasProgramme && { id: 'programme', label: 'Programme' },
        hasDebouches && { id: 'debouches', label: 'Débouchés' },
        hasTemoignages && { id: 'temoignages', label: 'Témoignages' },
        { id: 'rentree-contact', label: 'Rentrée & contact' },
    ].filter(Boolean) as { id: string; label: string }[];

    return (
        <PublicLayout>
            <Head title={`${formation.name} - EEHT de Thiès`} />

            <section className="relative overflow-hidden bg-ink-900 pb-16 pt-14 sm:pb-20 sm:pt-16">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-gold-500/5 blur-3xl"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-ink-300">
                        <Link href={route('formations.index')} className="transition-colors hover:text-gold-400">
                            Nos formations
                        </Link>
                        <span aria-hidden>/</span>
                        <span className="text-ink-100">{formation.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:items-center">
                        <div className="animate-fade-in-up lg:col-span-3">
                            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                                Formation
                            </span>
                            <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                                {formation.name}
                            </h1>
                            {formation.description && (
                                <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-200">
                                    {formation.description}
                                </p>
                            )}
                            <div className="mt-6 flex flex-wrap gap-3">
                                {formation.diploma_recognition && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-sm font-semibold text-ink-900">
                                        <ShieldCheck className="h-4 w-4" />
                                        {formation.diploma_recognition}
                                    </span>
                                )}
                                {formation.diploma && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                        <GraduationCap className="h-4 w-4 text-gold-400" />
                                        {formation.diploma}
                                    </span>
                                )}
                                {formation.level && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                        <Award className="h-4 w-4 text-gold-400" />
                                        {formation.level}
                                    </span>
                                )}
                                {formation.duration && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
                                        <Clock className="h-4 w-4 text-gold-400" />
                                        {formation.duration}
                                    </span>
                                )}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={route('candidature.create', { formation: formation.slug })}
                                    className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-soft transition-colors duration-150 hover:bg-gold-400"
                                >
                                    Candidater pour cette formation
                                </Link>
                                {visibleTabs.length > 0 && (
                                    <a
                                        href={`#${visibleTabs[0].id}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10"
                                    >
                                        Découvrir le programme
                                    </a>
                                )}
                            </div>
                        </div>

                        <div
                            className="relative animate-fade-in-up lg:col-span-2"
                            style={{ animationDelay: '120ms' }}
                        >
                            <div className="overflow-hidden rounded-2xl shadow-elevated">
                                {image ? (
                                    <img
                                        src={image}
                                        alt={formation.name}
                                        className="h-56 w-full object-cover sm:h-64 lg:h-72"
                                    />
                                ) : (
                                    <ImagePlaceholder
                                        className="h-56 w-full sm:h-64 lg:h-72"
                                        icon={ChefHat}
                                    />
                                )}
                            </div>
                            <div className="relative z-10 mx-4 -mt-10 rounded-2xl bg-white p-5 shadow-soft sm:mx-6">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <StatBox
                                        label="Inscription"
                                        value={feeLabel(formation.registration_fee)}
                                    />
                                    <StatBox
                                        label="Scolarité"
                                        value={feeLabel(formation.tuition_fee)}
                                    />
                                    {formation.capacity ? (
                                        <StatBox label="Places" value={`${formation.capacity}`} />
                                    ) : (
                                        <StatBox
                                            label="Format"
                                            value={formation.level ?? '—'}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {visibleTabs.length > 1 && (
                <div className="z-30 border-b border-ink-100 bg-white/95 lg:sticky lg:top-[105px] lg:backdrop-blur">
                    <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex gap-8 whitespace-nowrap">
                            {visibleTabs.map((tab) => (
                                <a
                                    key={tab.id}
                                    href={`#${tab.id}`}
                                    className="border-b-2 border-transparent py-4 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:border-gold-400 hover:text-ink-900"
                                >
                                    {tab.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {hasPresentation && (
                <section id="presentation" className="scroll-mt-[160px] py-16 sm:py-20">
                    <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                            Présentation
                        </span>
                        <h2 className="mt-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                            À propos de la formation
                        </h2>

                        {formation.description && (
                            <p className="mt-5 text-base leading-relaxed text-ink-600">
                                <span className="float-left mr-2 font-serif text-6xl font-bold leading-[0.8] text-gold-500">
                                    {formation.description.trim().charAt(0)}
                                </span>
                                {formation.description.trim().slice(1)}
                            </p>
                        )}

                        {formation.objectives && (
                            <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50/60 p-6 sm:p-8">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-500">
                                    <CheckCircle2 className="h-4 w-4 text-gold-500" />
                                    Objectifs
                                </h3>
                                {hasBulletMarkers(formation.objectives) ? (
                                    <ul className="mt-4 space-y-2.5">
                                        {parseBullets(formation.objectives).map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-700"
                                            >
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                                        {formation.objectives}
                                    </p>
                                )}
                            </div>
                        )}

                        <Link
                            href={route('candidature.create', { formation: formation.slug })}
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800"
                        >
                            Candidater pour cette formation
                        </Link>
                    </Reveal>
                </section>
            )}

            {hasAdmission && (
                <section id="admission" className="scroll-mt-[160px] bg-ink-50/70 py-16 sm:py-20">
                    <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                            Rejoindre la promotion
                        </span>
                        <h2 className="mt-2 flex items-center gap-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                            Conditions d'admission
                        </h2>

                        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-500">
                                <ClipboardCheck className="h-4 w-4 text-gold-500" />
                                Prérequis et pièces à fournir
                            </h3>
                            {hasBulletMarkers(formation.admission_conditions) ? (
                                <ul className="mt-4 space-y-2.5">
                                    {parseBullets(formation.admission_conditions as string).map(
                                        (item, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-700"
                                            >
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                                                {item}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            ) : (
                                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                                    {formation.admission_conditions}
                                </p>
                            )}
                        </div>
                    </Reveal>
                </section>
            )}

            {hasProgramme && (
                <section id="programme" className="scroll-mt-[160px] py-16 sm:py-20">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                                Contenu de la formation
                            </span>
                            <h2 className="mt-2 flex items-center gap-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                                <BookOpen className="h-6 w-6 text-gold-500" />
                                Programme
                            </h2>
                        </Reveal>

                        {formation.program &&
                            (hasBulletMarkers(formation.program) ? (
                                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {parseProgramSections(formation.program).map(
                                        (section, i) => (
                                            <Reveal key={i} delay={(i % 4) * 80}>
                                                <div className="h-full rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-soft">
                                                    {section.heading && (
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-gold-600">
                                                            {section.heading}
                                                        </h3>
                                                    )}
                                                    <ul className="mt-3 space-y-2">
                                                        {section.items.map((item, j) => (
                                                            <li
                                                                key={j}
                                                                className="flex items-start gap-2 text-sm leading-relaxed text-ink-700"
                                                            >
                                                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </Reveal>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink-600">
                                    {formation.program}
                                </p>
                            ))}

                        {formation.subjects && formation.subjects.length > 0 && (
                            <Reveal className="mt-10">
                                <h3 className="font-serif text-lg font-bold text-ink-900">
                                    Matières enseignées
                                </h3>
                                <div className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white shadow-sm">
                                    {formation.subjects.map((subject) => (
                                        <div
                                            key={subject.id}
                                            className="flex items-center justify-between px-5 py-3 text-sm"
                                        >
                                            <span className="font-medium text-ink-700">
                                                {subject.name}
                                            </span>
                                            <span className="rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
                                                Coefficient {subject.coefficient}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Reveal>
                        )}
                    </div>
                </section>
            )}

            {hasDebouches && (
                <section id="debouches" className="scroll-mt-[160px] bg-ink-50/70 py-16 sm:py-20">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                                Après la formation
                            </span>
                            <h2 className="mt-2 flex items-center gap-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                                <Briefcase className="h-6 w-6 text-gold-500" />
                                Débouchés professionnels
                            </h2>
                        </Reveal>

                        {hasBulletMarkers(formation.career_prospects) ? (
                            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {parseBullets(formation.career_prospects as string).map(
                                    (item, i) => (
                                        <Reveal key={i} delay={(i % 6) * 60}>
                                            <div className="flex h-full items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-soft">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-gold-400">
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <p className="pt-1.5 text-sm font-medium leading-snug text-ink-800">
                                                    {item}
                                                </p>
                                            </div>
                                        </Reveal>
                                    ),
                                )}
                            </div>
                        ) : (
                            <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink-600">
                                {formation.career_prospects}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {hasTemoignages && (
                <section id="temoignages" className="scroll-mt-[160px] py-16 sm:py-20">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                                Ils en parlent
                            </span>
                            <h2 className="mt-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                                Témoignages
                            </h2>
                        </Reveal>
                        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {formation.testimonials.map((testimonial, i) => (
                                <Reveal key={testimonial.id} delay={(i % 4) * 80}>
                                    <div className="h-full rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-soft">
                                        <Quote className="h-6 w-6 text-gold-200" />
                                        <p className="mt-3 text-sm leading-relaxed text-ink-600">
                                            « {testimonial.content} »
                                        </p>
                                        <StarRating rating={testimonial.rating} className="mt-4" />
                                        <div className="mt-3 flex items-center gap-3 border-t border-ink-100 pt-3">
                                            <div className="h-9 w-9 overflow-hidden rounded-full">
                                                <ImagePlaceholder
                                                    className="h-full w-full rounded-full"
                                                    label={initials(testimonial.name)}
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-ink-900">
                                                    {testimonial.name}
                                                </div>
                                                {testimonial.role && (
                                                    <div className="text-xs text-ink-500">
                                                        {testimonial.role}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section id="rentree-contact" className="scroll-mt-[160px] bg-ink-50/70 py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
                            Prochaine étape
                        </span>
                        <h2 className="mt-2 font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
                            Rentrée & contact
                        </h2>
                    </Reveal>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Reveal>
                            <div className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-500">
                                    <CalendarClock className="h-4 w-4 text-gold-500" />
                                    Prochaine rentrée
                                </h3>
                                {formation.next_intake_date ? (
                                    <>
                                        <p className="mt-4 font-serif text-2xl font-bold text-ink-900">
                                            {formatDateLong(formation.next_intake_date)}
                                        </p>
                                        <p className="mt-2 text-sm leading-relaxed text-ink-500">
                                            Les places sont limitées : déposez votre
                                            candidature dès maintenant pour rejoindre
                                            cette promotion.
                                        </p>
                                    </>
                                ) : (
                                    <p className="mt-4 text-sm leading-relaxed text-ink-500">
                                        La date de la prochaine rentrée sera bientôt
                                        annoncée. Contactez-nous pour être informé en
                                        priorité.
                                    </p>
                                )}
                                <Link
                                    href={route('candidature.create', { formation: formation.slug })}
                                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800"
                                >
                                    Candidater pour cette formation
                                </Link>
                            </div>
                        </Reveal>

                        <Reveal delay={80}>
                            <div className="h-full rounded-2xl bg-ink-900 p-6 text-white shadow-soft sm:p-8">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-300">
                                    Nous contacter
                                </h3>
                                <ul className="mt-5 space-y-5 text-sm">
                                    {siteSettings.site_address && (
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                                                <MapPin className="h-4 w-4 text-gold-400" />
                                            </span>
                                            <div>
                                                <div className="font-semibold text-white">
                                                    Adresse
                                                </div>
                                                <div className="mt-0.5 text-ink-300">
                                                    {siteSettings.site_address}
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                    {siteSettings.site_phone && (
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                                                <Phone className="h-4 w-4 text-gold-400" />
                                            </span>
                                            <div>
                                                <div className="font-semibold text-white">
                                                    Téléphone
                                                </div>
                                                <div className="mt-0.5 text-ink-300">
                                                    {siteSettings.site_phone}
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                    {siteSettings.site_email && (
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                                                <Mail className="h-4 w-4 text-gold-400" />
                                            </span>
                                            <div>
                                                <div className="font-semibold text-white">
                                                    Email
                                                </div>
                                                <div className="mt-0.5 text-ink-300">
                                                    {siteSettings.site_email}
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                </ul>
                                <Link
                                    href={route('pages.contact')}
                                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                                >
                                    Voir la page contact
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {others.length > 0 && (
                <section className="bg-ink-50/70 py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Reveal className="mb-8 flex items-end justify-between">
                            <h2 className="font-serif text-2xl font-bold text-ink-900">
                                Autres formations
                            </h2>
                            <Link
                                href={route('formations.index')}
                                className="hidden items-center gap-1.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:text-gold-600 sm:inline-flex"
                            >
                                Voir toutes les formations
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Reveal>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {others.map((other, i) => {
                                const otherImage = storageUrl(other.image);
                                return (
                                    <Reveal key={other.id} delay={i * 80}>
                                        <Link
                                            href={route('formations.show', other.slug)}
                                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated"
                                        >
                                            <div className="relative h-40 w-full overflow-hidden">
                                                {otherImage ? (
                                                    <img
                                                        src={otherImage}
                                                        alt={other.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                                                        label={initials(other.name)}
                                                    />
                                                )}
                                                {other.level && (
                                                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                                                        {other.level}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-1 flex-col p-5">
                                                <h3 className="font-serif text-base font-bold text-ink-900 transition-colors duration-150 group-hover:text-gold-600">
                                                    {other.name}
                                                </h3>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {other.diploma && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <GraduationCap className="h-3.5 w-3.5" />
                                                            {other.diploma}
                                                        </span>
                                                    )}
                                                    {other.duration && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {other.duration}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-800 transition-colors duration-150 group-hover:text-gold-600">
                                                    En savoir plus
                                                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                                                </span>
                                            </div>
                                        </Link>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}

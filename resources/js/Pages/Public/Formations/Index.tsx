import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import { PatternOverlay } from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { Formation } from '@/types';
import { formatFcfa, initials, storageUrl } from '@/lib/publicFormat';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BarChart3, Clock, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

/** "0.00" means "not published publicly" here, not "free" — show a call-to-contact instead of a misleading "0 FCFA". */
function feeLabel(value: string | number | null | undefined): string {
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return numeric ? formatFcfa(value) : 'Nous consulter';
}

export default function FormationsIndex({
    formations,
}: {
    formations: Formation[];
}) {
    const diplomaFilters = useMemo(() => {
        const counts = new Map<string, number>();
        formations.forEach((f) => {
            if (f.diploma) counts.set(f.diploma, (counts.get(f.diploma) ?? 0) + 1);
        });
        return Array.from(counts.entries());
    }, [formations]);

    const [activeDiploma, setActiveDiploma] = useState<string | null>(null);

    const visible = activeDiploma
        ? formations.filter((f) => f.diploma === activeDiploma)
        : formations;

    return (
        <PublicLayout>
            <Head title="Nos formations - EEHT de Thiès" />

            <PageHero
                eyebrow="Cursus & spécialités"
                title="Nos formations"
                subtitle="De la cuisine à l'accueil touristique en passant par la sommellerie et la gestion hôtelière, découvrez l'ensemble des formations proposées par l'EEHT de Thiès."
            >
                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
                    {formations.length} formation{formations.length > 1 ? 's' : ''}
                </span>
            </PageHero>

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {diplomaFilters.length > 0 && (
                        <Reveal className="mb-10 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
                                Diplôme
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveDiploma(null)}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                        activeDiploma === null
                                            ? 'bg-ink-900 text-white'
                                            : 'border border-ink-200 text-ink-600 hover:-translate-y-0.5 hover:bg-ink-50'
                                    }`}
                                >
                                    Tous
                                </button>
                                {diplomaFilters.map(([diploma, count]) => (
                                    <button
                                        key={diploma}
                                        type="button"
                                        onClick={() => setActiveDiploma(diploma)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                            activeDiploma === diploma
                                                ? 'bg-ink-900 text-white'
                                                : 'border border-ink-200 text-ink-600 hover:-translate-y-0.5 hover:bg-ink-50'
                                        }`}
                                    >
                                        {diploma}
                                        <span
                                            className={`rounded-full px-1.5 text-xs ${
                                                activeDiploma === diploma
                                                    ? 'bg-white/20'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Reveal>
                    )}

                    <p className="mb-6 text-sm text-ink-500">
                        {visible.length} formation{visible.length > 1 ? 's' : ''}
                    </p>

                    {visible.length === 0 ? (
                        <p className="text-center text-ink-500">
                            Aucune formation n'est disponible pour le moment.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {visible.map((formation, i) => {
                                const image = storageUrl(formation.image);
                                return (
                                    <Reveal key={formation.id} delay={(i % 6) * 70}>
                                        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated">
                                            <div className="relative h-48 w-full overflow-hidden">
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={formation.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder
                                                        className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                                                        label={initials(formation.name)}
                                                    />
                                                )}
                                                {formation.level && (
                                                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                                                        {formation.level}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-1 flex-col p-6">
                                                <h3 className="font-serif text-lg font-bold text-ink-900 transition-colors duration-200 group-hover:text-gold-600">
                                                    {formation.name}
                                                </h3>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {formation.diploma_recognition && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-800 ring-1 ring-inset ring-gold-600/30">
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            {formation.diploma_recognition}
                                                        </span>
                                                    )}
                                                    {formation.diploma && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <GraduationCap className="h-3.5 w-3.5" />
                                                            {formation.diploma}
                                                        </span>
                                                    )}
                                                    {formation.duration && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {formation.duration}
                                                        </span>
                                                    )}
                                                    {formation.level && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <BarChart3 className="h-3.5 w-3.5" />
                                                            {formation.level}
                                                        </span>
                                                    )}
                                                    {formation.capacity && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700 ring-1 ring-inset ring-leaf-600/20">
                                                            <Users className="h-3.5 w-3.5" />
                                                            {formation.capacity} places
                                                        </span>
                                                    )}
                                                </div>
                                                {formation.description && (
                                                    <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">
                                                        {formation.description}
                                                    </p>
                                                )}
                                                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-xs">
                                                    <div>
                                                        <div className="text-ink-400">Inscription</div>
                                                        <div className="mt-0.5 font-semibold text-ink-800">
                                                            {feeLabel(formation.registration_fee)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-ink-400">Scolarité</div>
                                                        <div className="mt-0.5 font-semibold text-ink-800">
                                                            {feeLabel(formation.tuition_fee)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={route('formations.show', formation.slug)}
                                                    className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors duration-200 hover:bg-ink-900 hover:text-white"
                                                >
                                                    En savoir plus
                                                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

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
                        Une formation qui vous ressemble vous attend
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
                        Du diplôme d'État au perfectionnement court, l'EEHT de
                        Thiès vous accompagne à chaque étape de votre
                        parcours vers les métiers de l'hôtellerie, de la
                        restauration et du tourisme.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:bg-gold-400"
                        >
                            Déposer ma candidature
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

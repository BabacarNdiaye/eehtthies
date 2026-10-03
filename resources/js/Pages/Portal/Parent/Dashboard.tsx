import Avatar from '@/Components/Connect/Avatar';
import Carousel from '@/Components/Portal/Carousel';
import NextClassCard from '@/Components/Portal/NextClassCard';
import PortalHero from '@/Components/Portal/PortalHero';
import SectionTitle from '@/Components/Portal/SectionTitle';
import StatRing from '@/Components/Portal/StatRing';
import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import { FeedItem, formatAmount, NextClass } from '@/lib/portal';
import { PageProps, Student } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';

export const parentNav: PortalNavItem[] = [
    { label: 'Mes enfants', href: 'parent.dashboard', active: (c) => c === 'parent.dashboard' || c === 'parent.child' },
    { label: 'EEHT Connect', href: 'connect.index', active: (c) => c.startsWith('connect.') },
];

type ChildRow = Student & {
    summary: { average: number | null; absences: number; balance_due: number; next_class: NextClass | null };
};

const kpiCard = 'flex flex-col items-center justify-center rounded-2xl bg-ink-50 p-3 text-center';

/** Accueil de l'espace parent : sélecteur d'enfants et résumé de l'enfant choisi. */
export default function Dashboard({ children, announcements }: { children: ChildRow[]; announcements: FeedItem[] }) {
    const { auth, portalProfile } = usePage<PageProps>().props;
    const [selectedId, setSelectedId] = useState<number | null>(children[0]?.id ?? null);
    const child = children.find((row) => row.id === selectedId) ?? children[0] ?? null;
    const photoOf = (row: Student) => (row.photo ? `/storage/${row.photo}` : null);

    const tiles = child
        ? [
              { label: 'Notes et bulletins', tab: 'notes', icon: GraduationCap },
              { label: 'Présences', tab: 'presences', icon: ClipboardCheck },
              { label: 'Factures', tab: 'factures', icon: Receipt },
              { label: 'Emploi du temps', tab: 'emploi', icon: CalendarDays },
          ]
        : [];

    return (
        <PortalLayout title="Espace Parent" nav={parentNav}>
            <Head title="Mes enfants" />

            <PortalHero
                name={portalProfile?.name ?? auth.user?.name ?? ''}
                lines={[portalProfile?.subtitle ? `Parent · ${portalProfile.subtitle}` : 'Parent d\'élève']}
                avatar={portalProfile?.photo}
            >
                {children.length > 1 && (
                    <div className="scrollbar-none relative -mx-5 mt-5 flex gap-2.5 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Choisir un enfant">
                        {children.map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                role="tab"
                                aria-selected={row.id === child?.id}
                                onClick={() => setSelectedId(row.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-colors ${
                                    row.id === child?.id ? 'bg-white text-ink-900 shadow-md' : 'bg-white/10 text-white backdrop-blur active:bg-white/20'
                                }`}
                            >
                                <Avatar name={`${row.first_name} ${row.last_name}`} src={photoOf(row)} size="sm" />
                                {row.first_name}
                            </button>
                        ))}
                    </div>
                )}
            </PortalHero>

            {child === null ? (
                <div className="relative z-10 -mt-10 rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-ink-100">
                    <GraduationCap className="mx-auto mb-3 h-8 w-8 text-ink-300" />
                    <p className="text-sm text-ink-500">Aucun enfant n'est encore associé à votre compte. Contactez l'administration de l'école.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <section className="relative z-10 -mt-10 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100 lg:-mt-8" aria-live="polite">
                        <div className="flex items-center gap-3.5">
                            <Avatar name={`${child.first_name} ${child.last_name}`} src={photoOf(child)} size="md" />
                            <div className="min-w-0">
                                <p className="truncate font-serif text-lg font-bold text-ink-900">
                                    {child.first_name} {child.last_name}
                                </p>
                                <p className="truncate text-sm text-ink-500">
                                    {[child.formation?.name, child.school_class?.name].filter(Boolean).join(' — ') || child.matricule}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2.5">
                            <div className={kpiCard}>
                                <StatRing value={child.summary.average} label="Moyenne" />
                            </div>
                            <div className={kpiCard}>
                                <span
                                    className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-bold ${
                                        child.summary.absences > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}
                                >
                                    {child.summary.absences}
                                </span>
                                <span className="mt-1.5 text-[11px] font-medium leading-tight text-ink-500">Absence{child.summary.absences > 1 ? 's' : ''}</span>
                            </div>
                            <div className={kpiCard}>
                                <span
                                    className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ${
                                        child.summary.balance_due > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}
                                >
                                    {child.summary.balance_due > 0 ? <Wallet className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                                </span>
                                <span className="mt-1.5 text-[11px] font-medium leading-tight text-ink-500">
                                    {child.summary.balance_due > 0 ? (
                                        <>
                                            À payer
                                            <br />
                                            <span className="text-xs font-bold text-red-600">{formatAmount(child.summary.balance_due)}</span>
                                        </>
                                    ) : (
                                        <>
                                            Scolarité
                                            <br />
                                            <span className="text-xs font-bold text-emerald-600">À jour</span>
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                    </section>

                    <NextClassCard next={child.summary.next_class} reloadProp="children" overlap={false} />

                    <section>
                        <SectionTitle title={`Suivre ${child.first_name}`} />
                        <ul className="grid grid-cols-4 gap-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                            {tiles.map((tile) => (
                                <li key={tile.tab}>
                                    <Link
                                        href={`${route('parent.child', child.id)}?tab=${tile.tab}`}
                                        className="flex flex-col items-center gap-2 rounded-2xl text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500"
                                    >
                                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-leaf-200 bg-leaf-50 text-leaf-800">
                                            <tile.icon className="h-6 w-6" />
                                        </span>
                                        <span className="text-[11px] font-medium leading-tight text-ink-700">{tile.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <SectionTitle title="À la une" />
                        <Carousel items={announcements} />
                    </section>
                </div>
            )}
        </PortalLayout>
    );
}

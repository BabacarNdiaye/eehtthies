import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    Banknote,
    CalendarCheck,
    CalendarOff,
    ChevronRight,
    Clock,
    Coins,
    GraduationCap,
    Network,
    Search,
    ShieldCheck,
    UserPlus,
    Users,
    UsersRound,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface DirectoryEntry {
    id: string;
    name: string;
    photo: string | null;
    role: string;
    detail: string;
    email: string | null;
    phone: string | null;
    active: boolean;
    editUrl: string;
    department: string | null;
    hireDate: string | null;
}

interface LeaveRow {
    id: number;
    name: string;
    type: string;
    start: string;
    end: string;
}

interface Props {
    directory: DirectoryEntry[];
    summary: {
        total: number;
        adminStaff: number;
        teachers: number;
        active: number;
        inactive: number;
        departmentsCount: number;
        monthlyPayroll: number;
        paidThisMonth: number;
        averageTenure: number | null;
        newThisYear: number;
        pendingLeaves: number;
        onLeaveToday: number;
        payrollStatus: string | null;
    };
    faculty: {
        totalHours: number;
        averageHours: number;
        averageExperience: number | null;
        fixed: number;
        hourly: number;
        withoutSchedule: number;
        withoutLogs: number;
        inactive: number;
        teachers: { id: number; name: string; photo: string | null; specialty: string; hours: number; classes: number; subjects: number; logs: number; payment: string; experience: number; editUrl: string }[];
    };
    departments: { name: string; count: number }[];
    leave: { pending: LeaveRow[]; today: LeaveRow[] };
    recentHires: { name: string; photo: string | null; detail: string; hireDate: string }[];
    incomplete: { label: string; count: number; href: string }[];
    can: { payroll: boolean; teachers: boolean; roles: boolean; orgChart: boolean };
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const longDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

function Avatar({ name, photo, className = 'h-9 w-9 text-xs' }: { name: string; photo: string | null; className?: string }) {
    const [broken, setBroken] = useState(false);

    return photo && !broken ? (
        <img
            src={`/storage/${photo.replace(/^\/+/, '')}`}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className={`shrink-0 rounded-full object-cover ring-1 ring-ink-200 ${className}`}
        />
    ) : (
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif font-bold text-gold-300 ${className}`}>
            {initials(name)}
        </span>
    );
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: { label: string; href: string }; children: React.ReactNode }) {
    return (
        <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div>
                    <h2 className="font-serif text-lg font-semibold text-ink-900">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
                </div>
                {action && (
                    <Link href={action.href} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-gold-700 hover:underline">
                        {action.label}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                )}
            </div>
            {children}
        </Card>
    );
}

function Empty({ icon: Icon, text }: { icon: typeof Users; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-ink-400">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-50">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm">{text}</p>
        </div>
    );
}

export default function Index({ directory, summary, faculty, departments, leave, recentHires, incomplete, can }: Props) {
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<'all' | 'admin' | 'teacher' | 'inactive'>('all');

    const people = useMemo(() => {
        const needle = q.trim().toLowerCase();

        return directory.filter((p) => {
            if (filter === 'admin' && p.role === 'Enseignant') return false;
            if (filter === 'teacher' && p.role !== 'Enseignant') return false;
            if (filter === 'inactive' && p.active) return false;
            if (!needle) return true;

            return [p.name, p.role, p.detail, p.email ?? '', p.department ?? ''].some((v) => v.toLowerCase().includes(needle));
        });
    }, [directory, q, filter]);

    const maxDept = Math.max(1, ...departments.map((d) => d.count));
    const maxHours = Math.max(1, ...faculty.teachers.map((t) => t.hours));
    const activeRate = summary.total ? Math.round((summary.active / summary.total) * 100) : 0;
    const teacherShare = summary.total ? Math.round((summary.teachers / summary.total) * 100) : 0;

    const kpis = [
        { label: 'Effectif', value: String(summary.total), hint: `${summary.adminStaff} administratifs · ${summary.teachers} enseignants`, icon: Users, tone: 'bg-ink-900 text-gold-300' },
        { label: 'Actifs', value: `${activeRate} %`, hint: `${summary.active} actifs, ${summary.inactive} inactifs`, icon: CalendarCheck, tone: 'bg-emerald-100 text-emerald-700' },
        { label: "Absents aujourd'hui", value: String(summary.onLeaveToday), hint: 'en congé approuvé', icon: CalendarOff, tone: 'bg-sky-100 text-sky-700' },
        { label: 'Congés à traiter', value: String(summary.pendingLeaves), hint: summary.pendingLeaves ? 'en attente de décision' : 'rien en attente', icon: Clock, tone: summary.pendingLeaves ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600' },
    ];

    const links = [
        { label: 'Personnel administratif', href: 'admin.users.index', icon: UsersRound, description: 'Comptes, fonctions, hiérarchie', show: true },
        { label: 'Enseignants', href: 'admin.teachers.index', icon: GraduationCap, description: 'Spécialités et classes', show: can.teachers },
        { label: 'Congés', href: 'admin.leave.index', icon: CalendarOff, description: 'Demandes et validations', show: true },
        { label: 'Paie mensuelle', href: 'admin.payroll.index', icon: Banknote, description: 'Préparer et verser les salaires', show: can.payroll },
        { label: 'Registre des salaires', href: 'admin.salaries.index', icon: Coins, description: 'Historique et export', show: can.payroll },
        { label: 'Organigramme', href: 'admin.org-chart.index', icon: Network, description: 'Hiérarchie du personnel', show: can.orgChart },
        { label: 'Rôles & permissions', href: 'admin.roles.index', icon: ShieldCheck, description: "Droits d'accès", show: can.roles },
    ].filter((l) => l.show);

    const filters = [
        { key: 'all' as const, label: 'Tous' },
        { key: 'admin' as const, label: 'Administratifs' },
        { key: 'teacher' as const, label: 'Enseignants' },
        { key: 'inactive' as const, label: 'Inactifs' },
    ];

    return (
        <AdminLayout>
            <Head title="Ressources humaines" />
            <PageHeader title="Ressources humaines" subtitle="Pilotez votre équipe : corps enseignant, personnel administratif, congés, paie et dossiers." />

            <section aria-label="Synthèse" className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Équipe de l'école</p>
                        <p className="mt-2 font-serif text-5xl font-bold tabular-nums sm:text-6xl">
                            {summary.total}
                            <span className="ml-3 text-lg font-medium text-white/60">membres du personnel</span>
                        </p>
                        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${teacherShare} % d'enseignants`}>
                            <span className="bg-gold-400" style={{ width: `${teacherShare}%` }} />
                            <span className="bg-white/50" style={{ width: `${100 - teacherShare}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/70">
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold-400" />Enseignants {summary.teachers}</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/50" />Administratifs {summary.adminStaff}</span>
                        </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Services</dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums">{summary.departmentsCount}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Ancienneté moyenne</dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums">{summary.averageTenure !== null ? `${summary.averageTenure} ans` : '—'}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Arrivées {new Date().getFullYear()}</dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums">{summary.newThisYear}</dd>
                        </div>
                        {can.payroll ? (
                            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                                <dt className="text-xs text-white/60">Masse salariale / mois</dt>
                                <dd className="mt-1 text-lg font-bold tabular-nums">{fcfa(summary.monthlyPayroll)}</dd>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                                <dt className="text-xs text-white/60">Enseignants</dt>
                                <dd className="mt-1 text-2xl font-bold tabular-nums">{summary.teachers}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </section>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((k) => (
                    <Card key={k.label} hoverable className="p-5">
                        <div className="flex items-center gap-4">
                            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${k.tone}`}>
                                <k.icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold tabular-nums text-ink-900">{k.value}</p>
                                <p className="text-sm font-medium text-ink-700">{k.label}</p>
                                <p className="truncate text-xs text-ink-500">{k.hint}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {can.payroll && (
                <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-800">
                            <Wallet className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="font-semibold text-ink-900">Paie du mois</p>
                            <p className="text-sm text-ink-500">
                                {summary.payrollStatus === 'validee'
                                    ? 'Validée — prête à être versée.'
                                    : summary.payrollStatus === 'brouillon'
                                      ? 'En préparation (brouillon) — à valider.'
                                      : "Pas encore préparée pour ce mois."}{' '}
                                Déjà versé : <strong className="text-ink-800">{fcfa(summary.paidThisMonth)}</strong>
                            </p>
                        </div>
                    </div>
                    <Link href={route('admin.payroll.index')} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2">
                        Ouvrir la paie
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </Card>
            )}

            <Card className="mb-6 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                    <div>
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Équipe pédagogique</h2>
                        <p className="mt-0.5 text-xs text-ink-500">Charge d'enseignement hebdomadaire d'après l'emploi du temps, et suivi du cahier de texte (30 derniers jours).</p>
                    </div>
                    {can.teachers && (
                        <Link href={route('admin.teachers.index')} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-gold-700 hover:underline">
                            Tous les enseignants
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                    )}
                </div>
                <dl className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Heures de cours / semaine', value: `${faculty.totalHours} h` },
                        { label: 'Charge moyenne', value: `${faculty.averageHours} h` },
                        { label: 'Expérience moyenne', value: faculty.averageExperience !== null ? `${faculty.averageExperience} ans` : '—' },
                        { label: 'Salaire fixe', value: String(faculty.fixed) },
                        { label: 'Payés à l\'heure', value: String(faculty.hourly) },
                        { label: 'Sans emploi du temps', value: String(faculty.withoutSchedule), warn: faculty.withoutSchedule > 0 },
                    ].map((m) => (
                        <div key={m.label} className="bg-white px-5 py-4">
                            <dt className="text-xs text-ink-500">{m.label}</dt>
                            <dd className={`mt-1 text-xl font-bold tabular-nums ${m.warn ? 'text-amber-700' : 'text-ink-900'}`}>{m.value}</dd>
                        </div>
                    ))}
                </dl>
                {faculty.teachers.length === 0 ? (
                    <Empty icon={GraduationCap} text="Aucun enseignant actif." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Enseignant</th>
                                    <th className="px-5 py-3">Charge hebdomadaire</th>
                                    <th className="px-5 py-3">Classes</th>
                                    <th className="px-5 py-3">Matières</th>
                                    <th className="px-5 py-3">Cahier de texte</th>
                                    <th className="px-5 py-3">Rémunération</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {faculty.teachers.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <Link href={t.editUrl} className="flex items-center gap-3 hover:underline">
                                                <Avatar name={t.name} photo={t.photo} />
                                                <span>
                                                    <span className="block font-medium text-ink-900">{t.name}</span>
                                                    <span className="block text-xs text-ink-500">{t.specialty} · {t.experience} an(s)</span>
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="min-w-[10rem] px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                                                    <div className={`h-full rounded-full ${t.hours === 0 ? 'bg-amber-400' : 'bg-gradient-to-r from-gold-500 to-gold-300'}`} style={{ width: `${(t.hours / maxHours) * 100}%` }} />
                                                </div>
                                                <span className="w-12 text-right text-xs font-semibold tabular-nums text-ink-700">{t.hours} h</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 tabular-nums text-ink-600">{t.classes}</td>
                                        <td className="px-5 py-3 tabular-nums text-ink-600">{t.subjects}</td>
                                        <td className="px-5 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.logs > 0 ? 'bg-emerald-100 text-emerald-700' : t.hours > 0 ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500'}`}>
                                                {t.logs > 0 ? `${t.logs} séance(s)` : t.hours > 0 ? 'Non rempli' : '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{t.payment}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <div className="mb-6 grid gap-6 lg:grid-cols-3">
                <Section title="Congés" hint="Demandes à traiter et absences du jour" action={{ label: 'Gérer', href: route('admin.leave.index') }}>
                    <div className="divide-y divide-ink-100">
                        {leave.pending.map((l) => (
                            <Link key={l.id} href={route('admin.leave.index')} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/70">
                                <Avatar name={l.name} photo={null} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink-900">{l.name}</p>
                                    <p className="text-xs text-ink-500">{l.type} · {day(l.start)} → {day(l.end)}</p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">À traiter</span>
                            </Link>
                        ))}
                        {leave.today.map((l) => (
                            <div key={`t${l.id}`} className="flex items-center gap-3 px-5 py-3">
                                <Avatar name={l.name} photo={null} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink-900">{l.name}</p>
                                    <p className="text-xs text-ink-500">{l.type} · jusqu'au {day(l.end)}</p>
                                </div>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Absent</span>
                            </div>
                        ))}
                        {leave.pending.length === 0 && leave.today.length === 0 && <Empty icon={CalendarCheck} text="Personne en congé, aucune demande en attente." />}
                    </div>
                </Section>

                <Section title="Répartition par service" hint="Effectif de chaque service">
                    {departments.length === 0 ? (
                        <Empty icon={Users} text="Aucun service renseigné." />
                    ) : (
                        <ul className="space-y-3 px-5 py-4">
                            {departments.map((d) => (
                                <li key={d.name}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <span className="truncate font-medium text-ink-800">{d.name}</span>
                                        <span className="tabular-nums text-ink-500">{d.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <div className="flex flex-col gap-6">
                    <Section title="Dernières arrivées" hint="Les 5 embauches les plus récentes">
                        {recentHires.length === 0 ? (
                            <Empty icon={UserPlus} text="Aucune date d'embauche renseignée." />
                        ) : (
                            <ul className="divide-y divide-ink-100">
                                {recentHires.map((h) => (
                                    <li key={h.name + h.hireDate} className="flex items-center gap-3 px-5 py-3">
                                        <Avatar name={h.name} photo={h.photo} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{h.name}</p>
                                            <p className="truncate text-xs text-ink-500">{h.detail}</p>
                                        </div>
                                        <span className="whitespace-nowrap text-xs text-ink-500">{longDay(h.hireDate)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                    {incomplete.length > 0 && (
                        <Section title="Dossiers à compléter">
                            <ul className="divide-y divide-ink-100">
                                {incomplete.map((i) => (
                                    <li key={i.label}>
                                        <Link href={i.href} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition hover:bg-ink-50/70">
                                            <span className="inline-flex items-center gap-2 text-ink-700">
                                                <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                                {i.label}
                                            </span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-700">{i.count}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
                {links.map((l) => (
                    <Link
                        key={l.label}
                        href={route(l.href)}
                        className="group flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft outline-none transition hover:-translate-y-0.5 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                        <l.icon className="h-5 w-5 text-gold-700" aria-hidden="true" />
                        <span className="flex items-center gap-1 text-sm font-semibold text-ink-900">
                            {l.label}
                            <ChevronRight className="h-3.5 w-3.5 text-ink-300 transition group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                        <span className="text-xs text-ink-500">{l.description}</span>
                    </Link>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-5">
                    <div>
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Annuaire du personnel</h2>
                        <p className="mt-0.5 text-xs text-ink-500">
                            {people.length} sur {directory.length} personne(s)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-xl bg-ink-50 p-1" role="group" aria-label="Filtrer l'annuaire">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setFilter(f.key)}
                                    aria-pressed={filter === f.key}
                                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${filter === f.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <label className="relative block">
                            <span className="sr-only">Rechercher dans l'annuaire</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Nom, fonction, service…"
                                className="w-56 rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30"
                            />
                        </label>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Nom</th>
                                <th className="px-5 py-3">Rôle</th>
                                <th className="px-5 py-3">Fonction / spécialité</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {people.map((person) => (
                                <tr key={person.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <Link href={person.editUrl} className="flex items-center gap-3 font-medium text-ink-900 hover:underline">
                                            <Avatar name={person.name} photo={person.photo} />
                                            {person.name}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${person.role === 'Enseignant' ? 'bg-gold-100 text-gold-800' : 'bg-ink-100 text-ink-700'}`}>{person.role}</span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{person.detail}</td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {person.email ?? '—'}
                                        {person.phone ? ` · ${person.phone}` : ''}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${person.active ? 'text-emerald-700' : 'text-ink-500'}`}>
                                            <span className={`h-2 w-2 rounded-full ${person.active ? 'bg-emerald-500' : 'bg-ink-300'}`} aria-hidden="true" />
                                            {person.active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {people.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <Empty icon={Users} text="Aucune personne ne correspond." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}

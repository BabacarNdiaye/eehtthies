import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import Drawer from '@/Components/Admin/Drawer';
import PageHeader from '@/Components/Admin/PageHeader';
import { ClassTabs } from '@/Components/Admin/ClusterTabs';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { SearchField } from '@/Components/Admin/FilterBar';
import { confirmAction } from '@/lib/confirm';
import { PageProps, SchoolClass } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, GraduationCap, Inbox, Pencil, Plus, Presentation, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type ClassRow = SchoolClass & {
    formation: { id: number; name: string };
    academic_year: { id: number; label: string };
    next_class?: { id: number; name: string } | null;
    formation_level?: { id: number; formation_id: number; label: string } | null;
    students_count: number;
    teachers_count: number;
};

interface Props {
    schoolClasses: ClassRow[];
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string; is_current?: boolean }[];
    formationLevels: { id: number; formation_id: number; label: string }[];
}

type FormData = {
    name: string;
    formation_id: number | '';
    academic_year_id: number | '';
    capacity: number | '';
    next_class_id: number | '';
    formation_level_id: number | '';
};

const EMPTY: FormData = { name: '', formation_id: '', academic_year_id: '', capacity: '', next_class_id: '', formation_level_id: '' };

/** Remplissage : couleur de la jauge selon l'effectif par rapport à la capacité. */
function fill(c: ClassRow) {
    const cap = c.capacity ?? 0;

    if (!cap) return { pct: null as number | null, bar: 'bg-ink-300', text: 'text-ink-500', label: 'Capacité non définie' };

    const pct = Math.round((c.students_count / cap) * 100);

    if (pct > 100) return { pct, bar: 'bg-rose-500', text: 'text-rose-700', label: 'Capacité dépassée' };
    if (pct >= 100) return { pct, bar: 'bg-rose-500', text: 'text-rose-700', label: 'Complète' };
    if (pct >= 85) return { pct, bar: 'bg-amber-500', text: 'text-amber-700', label: 'Presque complète' };
    if (pct === 0) return { pct, bar: 'bg-ink-300', text: 'text-ink-500', label: 'Sans élève' };

    return { pct, bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'Places disponibles' };
}

export default function Index({ schoolClasses, formations, academicYears, formationLevels }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canAdd = permissions.includes('ajouter_classes');
    const canEdit = permissions.includes('modifier_classes');
    const canDelete = permissions.includes('supprimer_classes');
    const canSeeStudents = permissions.includes('voir_eleves');

    const current = academicYears.find((y) => y.is_current)?.id ?? '';
    const [year, setYear] = useState<number | ''>(current);
    const [formation, setFormation] = useState<number | ''>('');
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState<ClassRow | null>(null);
    const [creating, setCreating] = useState(false);

    const form = useForm<FormData>(EMPTY);
    const open = creating || editing !== null;

    const openCreate = () => {
        form.setData({ ...EMPTY, academic_year_id: current });
        form.clearErrors();
        setEditing(null);
        setCreating(true);
    };

    const openEdit = (c: ClassRow) => {
        form.setData({
            name: c.name,
            formation_id: c.formation_id,
            academic_year_id: c.academic_year_id,
            capacity: c.capacity ?? '',
            next_class_id: c.next_class_id ?? '',
            formation_level_id: c.formation_level_id ?? '',
        });
        form.clearErrors();
        setCreating(false);
        setEditing(c);
    };

    const close = () => {
        setCreating(false);
        setEditing(null);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const done = { preserveScroll: true, onSuccess: close };

        if (editing) form.patch(route('admin.school-classes.update', editing.id), done);
        else form.post(route('admin.school-classes.store'), done);
    };

    const destroy = async (c: ClassRow) => {
        if (await confirmAction(`Supprimer la classe « ${c.name} » ? Cette action est irréversible.`)) {
            router.delete(route('admin.school-classes.destroy', c.id), { preserveScroll: true });
        }
    };

    const visible = useMemo(() => {
        const needle = q.trim().toLowerCase();

        return schoolClasses.filter(
            (c) => (year === '' || c.academic_year_id === year) && (formation === '' || c.formation_id === formation) && (!needle || `${c.name} ${c.formation?.name ?? ''}`.toLowerCase().includes(needle)),
        );
    }, [schoolClasses, year, formation, q]);

    const totals = useMemo(() => {
        const students = visible.reduce((a, c) => a + c.students_count, 0);
        const capacity = visible.reduce((a, c) => a + (c.capacity ?? 0), 0);
        const withCap = visible.filter((c) => c.capacity);

        return {
            students,
            capacity,
            rate: capacity ? Math.round((withCap.reduce((a, c) => a + c.students_count, 0) / capacity) * 100) : null,
            full: visible.filter((c) => c.capacity && c.students_count >= c.capacity).length,
            empty: visible.filter((c) => c.students_count === 0).length,
        };
    }, [visible]);

    const grouped = useMemo(() => {
        const map = new Map<string, { name: string; classes: ClassRow[] }>();

        for (const c of visible) {
            const key = String(c.formation_id);
            map.set(key, map.get(key) ?? { name: c.formation?.name ?? 'Sans formation', classes: [] });
            map.get(key)!.classes.push(c);
        }

        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [visible]);

    const levelsOfFormation = formationLevels.filter((l) => l.formation_id === form.data.formation_id);
    const nextOptions = schoolClasses.filter((c) => c.id !== editing?.id);
    const errs = form.errors as Record<string, string>;
    const yearLabel = academicYears.find((y) => y.id === year)?.label;

    return (
        <AdminLayout>
            <Head title="Classes" />
            <PageHeader title="Classes" subtitle="Les classes de chaque formation et année académique : effectifs, capacité et passage à la classe suivante.">
                {canAdd && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle classe
                    </button>
                )}
            </PageHeader>
            <ClassTabs current="classes" />

            <section aria-label="Synthèse des classes" className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">{yearLabel ? `Année ${yearLabel}` : 'Toutes les années'}</p>
                        <p className="mt-2 font-serif text-5xl font-bold tabular-nums">
                            {visible.length}
                            <span className="ml-3 text-lg font-medium text-white/60">classe(s)</span>
                        </p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Taux de remplissage ${totals.rate ?? 0} %`}>
                            <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${Math.min(100, totals.rate ?? 0)}%` }} />
                        </div>
                        <p className="mt-2 text-sm text-white/60">{totals.rate !== null ? `Remplissage global : ${totals.rate} % (${totals.students} élève(s) pour ${totals.capacity} place(s))` : `${totals.students} élève(s) — capacités non définies`}</p>
                    </div>
                    <dl className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Élèves</dt>
                            <dd className="mt-1 text-xl font-bold tabular-nums">{totals.students}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Complètes</dt>
                            <dd className={`mt-1 text-xl font-bold tabular-nums ${totals.full ? 'text-amber-300' : ''}`}>{totals.full}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Sans élève</dt>
                            <dd className="mt-1 text-xl font-bold tabular-nums">{totals.empty}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <div className="mb-5 flex flex-wrap items-center gap-3">
                <Select aria-label="Année académique" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')} className="max-w-[15rem]">
                    <option value="">Toutes les années</option>
                    {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                            {y.label}
                            {y.is_current ? ' (en cours)' : ''}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Formation" value={formation} onChange={(e) => setFormation(e.target.value ? Number(e.target.value) : '')} className="max-w-[16rem]">
                    <option value="">Toutes les formations</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
                <div className="min-w-[14rem] flex-1">
                    <SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une classe…" />
                </div>
            </div>

            <div className="space-y-8">
                {grouped.map((g) => (
                    <section key={g.name} aria-label={g.name}>
                        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                            <GraduationCap className="h-5 w-5 text-gold-700" aria-hidden="true" />
                            {g.name}
                            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">{g.classes.length}</span>
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {g.classes.map((c) => {
                                const f = fill(c);

                                return (
                                    <Card key={c.id} hoverable className="flex flex-col p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate font-serif text-lg font-bold text-ink-900">{c.name}</h3>
                                                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                                                    <span className="rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600">{c.academic_year?.label ?? '—'}</span>
                                                    {c.formation_level?.label && <span className="rounded bg-gold-100 px-1.5 py-0.5 font-medium text-gold-800">{c.formation_level.label}</span>}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                {canEdit && (
                                                    <IconButton onClick={() => openEdit(c)} label={`Modifier ${c.name}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </IconButton>
                                                )}
                                                {canDelete && (
                                                    <IconButton onClick={() => destroy(c)} label={`Supprimer ${c.name}`} tone="danger">
                                                        <Trash2 className="h-4 w-4" />
                                                    </IconButton>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex items-baseline justify-between text-sm">
                                                <span className="font-semibold tabular-nums text-ink-900">
                                                    {c.students_count} <span className="font-normal text-ink-500">/ {c.capacity ?? '—'} élèves</span>
                                                </span>
                                                <span className={`text-xs font-semibold ${f.text}`}>{f.pct !== null ? `${f.pct} %` : '—'}</span>
                                            </div>
                                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`${f.label}`}>
                                                <div className={`h-full rounded-full ${f.bar}`} style={{ width: `${Math.min(100, f.pct ?? 0)}%` }} />
                                            </div>
                                            <p className={`mt-1 text-xs ${f.text}`}>{f.label}</p>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Presentation className="h-3.5 w-3.5" aria-hidden="true" /> {c.teachers_count} enseignant(s)
                                            </span>
                                            {c.next_class ? (
                                                <span className="inline-flex items-center gap-1 font-medium text-ink-600" title="Classe suivante">
                                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> {c.next_class.name}
                                                </span>
                                            ) : (
                                                <span className="text-ink-400">Pas de classe suivante</span>
                                            )}
                                        </div>

                                        {canSeeStudents && (
                                            <Link href={route('admin.students.index', { school_class_id: c.id })} className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-gold-700 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-gold-500">
                                                <Users className="h-4 w-4" aria-hidden="true" /> Voir les élèves
                                            </Link>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {grouped.length === 0 && (
                    <Card className="flex flex-col items-center gap-3 px-5 py-14 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">{schoolClasses.length === 0 ? 'Aucune classe enregistrée pour le moment.' : 'Aucune classe ne correspond à ces filtres.'}</p>
                    </Card>
                )}
            </div>

            <Drawer
                open={open}
                onClose={close}
                title={editing ? `Modifier ${editing.name}` : 'Nouvelle classe'}
                subtitle="Formation, année, capacité et passage à la classe suivante."
                footer={
                    <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={close} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            Annuler
                        </button>
                        <button type="submit" form="class-form" disabled={form.processing} className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            {editing ? 'Enregistrer' : 'Créer la classe'}
                        </button>
                    </div>
                }
            >
                <form id="class-form" onSubmit={submit} className="space-y-4">
                    <Field label="Nom de la classe" required error={errs.name}>
                        <TextInput value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="BTS Hôtellerie 1" />
                    </Field>
                    <Field label="Formation" required error={errs.formation_id}>
                        <Select value={form.data.formation_id} onChange={(e) => form.setData({ ...form.data, formation_id: e.target.value ? Number(e.target.value) : '', formation_level_id: '' })}>
                            <option value="">Sélectionner…</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Année académique" required error={errs.academic_year_id}>
                        <Select value={form.data.academic_year_id} onChange={(e) => form.setData('academic_year_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Sélectionner…</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                    {y.is_current ? ' (en cours)' : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Capacité" error={errs.capacity} hint="Nombre maximum d'élèves">
                        <TextInput type="number" min="0" value={form.data.capacity} onChange={(e) => form.setData('capacity', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                    <Field label="Niveau" error={errs.formation_level_id} hint="Utilisé par les règles de passage de la formation">
                        <Select value={form.data.formation_level_id} onChange={(e) => form.setData('formation_level_id', e.target.value ? Number(e.target.value) : '')} disabled={levelsOfFormation.length === 0}>
                            <option value="">{levelsOfFormation.length === 0 ? 'Aucun niveau pour cette formation' : 'Aucun (manuel)'}</option>
                            {levelsOfFormation.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Classe suivante" error={errs.next_class_id} hint="Repli manuel quand aucun niveau n'est défini">
                        <Select value={form.data.next_class_id} onChange={(e) => form.setData('next_class_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucune</option>
                            {nextOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.academic_year?.label})
                                </option>
                            ))}
                        </Select>
                    </Field>
                </form>
            </Drawer>
        </AdminLayout>
    );
}

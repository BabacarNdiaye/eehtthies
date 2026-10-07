import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import Drawer from '@/Components/Admin/Drawer';
import PageHeader from '@/Components/Admin/PageHeader';
import { ClassTabs } from '@/Components/Admin/ClusterTabs';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { AcademicYear, PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { CalendarRange, Inbox, Pencil, Plus, School, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

type YearRow = AcademicYear & { students_count: number; school_classes_count: number };

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const dateFr = (iso: string) => new Date(toDateInput(iso) + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Où en est l'année : à venir, en cours (avec l'avancement dans le temps) ou terminée. */
function phase(year: YearRow, now = new Date()) {
    const start = new Date(toDateInput(year.start_date) + 'T00:00:00').getTime();
    const end = new Date(toDateInput(year.end_date) + 'T23:59:59').getTime();
    const t = now.getTime();
    const progress = Math.max(0, Math.min(100, Math.round(((t - start) / (end - start)) * 100)));

    if (t < start) return { key: 'upcoming', label: 'À venir', tone: 'bg-sky-100 text-sky-700', progress: 0, hint: `Commence dans ${Math.ceil((start - t) / 86_400_000)} jour(s)` };
    if (t > end) return { key: 'past', label: 'Terminée', tone: 'bg-ink-100 text-ink-600', progress: 100, hint: 'Année close' };

    return { key: 'running', label: 'En cours', tone: 'bg-emerald-100 text-emerald-700', progress, hint: `${progress} % de l'année écoulée · ${Math.ceil((end - t) / 86_400_000)} jour(s) restant(s)` };
}

export default function Index({ academicYears }: { academicYears: YearRow[] }) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canAdd = permissions.includes('ajouter_classes');
    const canEdit = permissions.includes('modifier_classes');
    const canDelete = permissions.includes('supprimer_classes');

    const [editing, setEditing] = useState<YearRow | null>(null);
    const [creating, setCreating] = useState(false);
    const form = useForm({ label: '', start_date: '', end_date: '', is_current: false });
    const errs = form.errors as Record<string, string>;
    const open = creating || editing !== null;

    const openCreate = () => {
        const y = new Date().getFullYear();
        form.setData({ label: `${y}-${y + 1}`, start_date: `${y}-09-01`, end_date: `${y + 1}-06-30`, is_current: academicYears.length === 0 });
        form.clearErrors();
        setEditing(null);
        setCreating(true);
    };

    const openEdit = (year: YearRow) => {
        form.setData({ label: year.label, start_date: toDateInput(year.start_date), end_date: toDateInput(year.end_date), is_current: year.is_current });
        form.clearErrors();
        setCreating(false);
        setEditing(year);
    };

    const close = () => {
        setCreating(false);
        setEditing(null);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const done = { preserveScroll: true, onSuccess: close };

        if (editing) form.patch(route('admin.academic-years.update', editing.id), done);
        else form.post(route('admin.academic-years.store'), done);
    };

    const destroy = async (year: YearRow) => {
        if (await confirmAction(`Supprimer l'année académique « ${year.label} » ? Cette action est irréversible.`)) {
            router.delete(route('admin.academic-years.destroy', year.id), { preserveScroll: true });
        }
    };

    const flagged = academicYears.find((y) => y.is_current);

    return (
        <AdminLayout>
            <Head title="Années académiques" />
            <PageHeader title="Années académiques" subtitle="Le calendrier de l'école : l'année en cours pilote les inscriptions, les classes et les bulletins.">
                {canAdd && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle année
                    </button>
                )}
            </PageHeader>
            <ClassTabs current="years" />

            {!flagged && academicYears.length > 0 && (
                <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <strong>Aucune année n'est marquée « en cours ».</strong> Les nouvelles inscriptions et les classes proposées par défaut en dépendent : marquez l'année actuelle comme année en cours.
                </div>
            )}

            <div className="space-y-4">
                {academicYears.map((year) => {
                    const p = phase(year);

                    return (
                        <Card key={year.id} className={`overflow-hidden ${year.is_current ? 'ring-2 ring-gold-500/60' : ''}`}>
                            <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                                <div className="flex min-w-0 items-start gap-4">
                                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${year.is_current ? 'bg-ink-900 text-gold-300' : 'bg-ink-100 text-ink-600'}`}>
                                        <CalendarRange className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-serif text-xl font-bold text-ink-900">{year.label}</h2>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.tone}`}>{p.label}</span>
                                            {year.is_current && <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">Année de référence</span>}
                                        </div>
                                        <p className="mt-1 text-sm text-ink-500">
                                            Du {dateFr(year.start_date)} au {dateFr(year.end_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {canEdit && (
                                        <IconButton onClick={() => openEdit(year)} label={`Modifier ${year.label}`}>
                                            <Pencil className="h-4 w-4" />
                                        </IconButton>
                                    )}
                                    {canDelete && (
                                        <IconButton onClick={() => destroy(year)} label={`Supprimer ${year.label}`} tone="danger">
                                            <Trash2 className="h-4 w-4" />
                                        </IconButton>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 border-t border-ink-100 bg-ink-50/50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                                <div>
                                    <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={p.hint}>
                                        <div className={`h-full rounded-full ${p.key === 'running' ? 'bg-gradient-to-r from-gold-500 to-gold-300' : p.key === 'past' ? 'bg-ink-300' : 'bg-sky-300'}`} style={{ width: `${p.progress}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-xs text-ink-500">{p.hint}</p>
                                </div>
                                <div className="flex gap-6 text-sm">
                                    <span className="inline-flex items-center gap-2 text-ink-700">
                                        <School className="h-4 w-4 text-ink-400" aria-hidden="true" />
                                        <strong className="tabular-nums text-ink-900">{year.school_classes_count}</strong> classe(s)
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-ink-700">
                                        <Users className="h-4 w-4 text-ink-400" aria-hidden="true" />
                                        <strong className="tabular-nums text-ink-900">{year.students_count}</strong> élève(s)
                                    </span>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {academicYears.length === 0 && (
                    <Card className="flex flex-col items-center gap-3 px-5 py-14 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Aucune année académique enregistrée pour le moment.</p>
                    </Card>
                )}
            </div>

            <Drawer
                open={open}
                onClose={close}
                title={editing ? `Modifier ${editing.label}` : 'Nouvelle année académique'}
                subtitle="Libellé, dates de début et de fin."
                footer={
                    <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={close} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            Annuler
                        </button>
                        <button type="submit" form="year-form" disabled={form.processing} className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            {editing ? 'Enregistrer' : "Créer l'année"}
                        </button>
                    </div>
                }
            >
                <form id="year-form" onSubmit={submit} className="space-y-4">
                    <Field label="Libellé" required error={errs.label}>
                        <TextInput value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} placeholder="2026-2027" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Début" required error={errs.start_date}>
                            <TextInput type="date" value={form.data.start_date} onChange={(e) => form.setData('start_date', e.target.value)} />
                        </Field>
                        <Field label="Fin" required error={errs.end_date}>
                            <TextInput type="date" value={form.data.end_date} onChange={(e) => form.setData('end_date', e.target.value)} />
                        </Field>
                    </div>
                    <label className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5 text-sm text-ink-700">
                        <Checkbox checked={form.data.is_current} onChange={(e) => form.setData('is_current', e.target.checked)} />
                        <span>
                            <strong className="block text-ink-900">Année en cours (référence)</strong>
                            Une seule année peut l'être : en cocher une retire la marque de l'autre.
                        </span>
                    </label>
                </form>
            </Drawer>
        </AdminLayout>
    );
}

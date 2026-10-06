import Card from '@/Components/Admin/Card';
import Drawer from '@/Components/Admin/Drawer';
import { Checkbox, Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { DecisionTypeRow, TONE_SWATCH, toneClasses } from '@/lib/council';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    types: DecisionTypeRow[];
    categories: Record<string, string>;
    tones: Record<string, string>;
    mentions: Record<string, string>;
    reportDecisions: Record<string, string>;
    canEdit: boolean;
}

const keep = { preserveScroll: true, preserveState: true } as const;

function Flag({ children }: { children: string }) {
    return <span className="rounded-md bg-ink-50 px-2 py-0.5 text-xs text-ink-600 ring-1 ring-inset ring-ink-200">{children}</span>;
}

function TypeForm({ type, category, categories, tones, mentions, reportDecisions, onDone }: Omit<Props, 'types' | 'canEdit'> & { type: DecisionTypeRow | null; category: string; onDone: () => void }) {
    const { data, setData, post, patch, processing, errors } = useForm({
        code: type?.code ?? '',
        label: type?.label ?? '',
        category: type?.category ?? category,
        color: type?.color ?? 'ink',
        is_active: type?.is_active ?? true,
        is_published_on_report: type?.is_published_on_report ?? true,
        is_end_of_year_only: type?.is_end_of_year_only ?? false,
        requires_vote: type?.requires_vote ?? false,
        creates_follow_up: type?.creates_follow_up ?? false,
        requires_reason: type?.requires_reason ?? false,
        report_mention: type?.report_mention ?? '',
        report_decision: type?.report_decision ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { ...keep, onSuccess: onDone };

        if (type) {
            patch(route('admin.council-settings.decision-types.update', type.id), options);
        } else {
            post(route('admin.council-settings.decision-types.store'), options);
        }
    };

    const orientation = data.category === 'orientation';
    const flag = (name: 'is_active' | 'is_published_on_report' | 'is_end_of_year_only' | 'requires_vote' | 'creates_follow_up' | 'requires_reason', label: string, hint?: string, disabled = false) => (
        <label className="flex items-start gap-3 text-sm text-ink-800">
            <Checkbox className="mt-0.5" checked={data[name]} disabled={disabled} onChange={(e) => setData(name, e.target.checked)} />
            <span>
                {label}
                {hint && <span className="block text-xs text-ink-500">{hint}</span>}
            </span>
        </label>
    );

    return (
        <form id="decision-type-form" onSubmit={submit} className="space-y-4" aria-busy={processing}>
            <Field label="Libellé" required error={errors.label}>
                <TextInput value={data.label} onChange={(e) => setData('label', e.target.value)} />
            </Field>
            {type ? (
                <p className="text-xs text-ink-500">
                    Code : <span className="font-mono">{type.code}</span> (il ne change pas)
                </p>
            ) : (
                <Field label="Code" required error={errors.code} hint="Lettres minuscules, chiffres et tirets bas ; il ne pourra plus changer.">
                    <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="tableau_honneur" />
                </Field>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Catégorie" required error={errors.category} hint={type?.is_used ? 'Déjà utilisée dans des décisions : elle ne change plus.' : undefined}>
                    <Select value={data.category} disabled={!!type?.is_used} onChange={(e) => setData('category', e.target.value)}>
                        {Object.entries(categories).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Couleur" required error={errors.color}>
                    <div className="flex items-center gap-2">
                        <span aria-hidden="true" className={`h-5 w-5 shrink-0 rounded-full ${TONE_SWATCH[data.color] ?? ''}`} />
                        <Select value={data.color} onChange={(e) => setData('color', e.target.value)}>
                            {Object.entries(tones).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </Field>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-ink-100 p-4">
                <legend className="px-1 text-sm font-medium text-ink-700">Règles</legend>
                {flag('is_published_on_report', 'Publiable sur le bulletin')}
                {flag('is_end_of_year_only', 'Réservé au conseil de fin d’année', orientation ? 'Toujours le cas d’une orientation.' : undefined, orientation)}
                {flag('requires_vote', 'Soumis à un vote')}
                {flag('creates_follow_up', 'Crée une action de suivi', 'L’action est créée à la clôture du conseil.')}
                {flag('requires_reason', 'Motif obligatoire')}
                {flag('is_active', 'Actif', 'Un type inactif n’est plus proposé en séance.')}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mention du bulletin" error={errors.report_mention} hint="Reportée sur le bulletin à la clôture.">
                    <Select value={data.report_mention} onChange={(e) => setData('report_mention', e.target.value)}>
                        <option value="">Aucune</option>
                        {Object.entries(mentions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Décision du bulletin" error={errors.report_decision} hint="Pour une orientation.">
                    <Select value={data.report_decision} onChange={(e) => setData('report_decision', e.target.value)}>
                        <option value="">Aucune</option>
                        {Object.entries(reportDecisions).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>
        </form>
    );
}

export default function DecisionTypesTab({ types, categories, tones, mentions, reportDecisions, canEdit }: Props) {
    const [editing, setEditing] = useState<{ type: DecisionTypeRow | null; category: string } | null>(null);

    const destroy = async (type: DecisionTypeRow) => {
        if (await confirmAction(`Supprimer le type « ${type.label} » ? Ses incompatibilités disparaissent avec lui.`)) {
            router.delete(route('admin.council-settings.decision-types.destroy', type.id), keep);
        }
    };

    const toggle = (type: DecisionTypeRow) =>
        router.patch(
            route('admin.council-settings.decision-types.update', type.id),
            { ...type, is_active: !type.is_active, report_mention: type.report_mention ?? '', report_decision: type.report_decision ?? '' },
            keep,
        );

    return (
        <div className="space-y-6">
            {Object.entries(categories).map(([category, categoryLabel]) => {
                const rows = types.filter((type) => type.category === category);

                return (
                    <Card key={category} className="overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
                            <h2 className="font-serif text-base font-bold text-ink-900">
                                {categoryLabel} <span className="text-sm font-normal text-ink-500">({rows.length})</span>
                            </h2>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => setEditing({ type: null, category })}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                                >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Ajouter
                                </button>
                            )}
                        </div>
                        <ul className="divide-y divide-ink-100">
                            {rows.map((type) => (
                                <li key={type.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                                    <div className="min-w-0 flex-1 basis-60">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses(type.color)}`}>{type.label}</span>
                                            {!type.is_active && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">Inactif</span>}
                                            {type.is_used && <span className="text-xs text-ink-500">Déjà utilisé</span>}
                                        </p>
                                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                                            {type.is_published_on_report && <Flag>Sur le bulletin</Flag>}
                                            {type.is_end_of_year_only && <Flag>Fin d’année</Flag>}
                                            {type.requires_vote && <Flag>Vote</Flag>}
                                            {type.creates_follow_up && <Flag>Crée une action</Flag>}
                                            {type.requires_reason && <Flag>Motif obligatoire</Flag>}
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={type.is_active}
                                                aria-label={`${type.is_active ? 'Désactiver' : 'Activer'} « ${type.label} »`}
                                                onClick={() => toggle(type)}
                                                className={`relative h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${type.is_active ? 'bg-emerald-700' : 'bg-ink-300'}`}
                                            >
                                                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${type.is_active ? 'translate-x-5' : ''}`} />
                                            </button>
                                            <IconButton label={`Modifier « ${type.label} »`} onClick={() => setEditing({ type, category })}>
                                                <Pencil className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton label={`Supprimer « ${type.label} »`} tone="danger" disabled={type.is_used} onClick={() => destroy(type)}>
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    )}
                                </li>
                            ))}
                            {rows.length === 0 && <li className="px-5 py-6 text-sm text-ink-500">Aucun type dans cette catégorie.</li>}
                        </ul>
                    </Card>
                );
            })}

            <Drawer
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={editing?.type ? 'Modifier le type de décision' : 'Nouveau type de décision'}
                footer={
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            Annuler
                        </button>
                        <button type="submit" form="decision-type-form" className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                            Enregistrer
                        </button>
                    </div>
                }
            >
                {editing && <TypeForm type={editing.type} category={editing.category} categories={categories} tones={tones} mentions={mentions} reportDecisions={reportDecisions} onDone={() => setEditing(null)} />}
            </Drawer>
        </div>
    );
}

import Card from '@/Components/Admin/Card';
import { Field, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

interface Criterion {
    id: number;
    label: string;
    is_active: boolean;
}

const keep = { preserveScroll: true, preserveState: true } as const;

/** Grille d'évaluation de stage (PAR-07) ; l'échelle va de « Très satisfaisant » à « Insuffisant ». */
export default function InternshipCriteriaTab({ criteria, canEdit }: { criteria: Criterion[]; canEdit: boolean }) {
    const form = useForm({ label: '' });

    const toggle = (criterion: Criterion) => router.patch(route('admin.council-settings.internship-criteria.update', criterion.id), { label: criterion.label, is_active: !criterion.is_active }, keep);
    const destroy = async (criterion: Criterion) => {
        if (await confirmAction(`Supprimer le critère « ${criterion.label} » ? S’il a déjà servi, il sera seulement désactivé.`)) {
            router.delete(route('admin.council-settings.internship-criteria.destroy', criterion.id), keep);
        }
    };

    return (
        <Card className="max-w-3xl overflow-hidden">
            <p className="border-b border-ink-100 px-5 py-3 text-sm text-ink-600">Échelle : Très satisfaisant · Satisfaisant · À améliorer · Insuffisant.</p>
            <ul className="divide-y divide-ink-100">
                {criteria.map((criterion) => (
                    <li key={criterion.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={`min-w-0 flex-1 text-sm ${criterion.is_active ? 'text-ink-900' : 'text-ink-400 line-through'}`}>{criterion.label}</span>
                        {canEdit && (
                            <>
                                <button type="button" onClick={() => toggle(criterion)} className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                                    {criterion.is_active ? 'Désactiver' : 'Activer'}
                                </button>
                                <IconButton label={`Supprimer « ${criterion.label} »`} tone="danger" onClick={() => destroy(criterion)}>
                                    <Trash2 className="h-4 w-4" />
                                </IconButton>
                            </>
                        )}
                    </li>
                ))}
            </ul>
            {canEdit && (
                <form
                    className="flex items-end gap-3 border-t border-ink-100 p-5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('admin.council-settings.internship-criteria.store'), { ...keep, onSuccess: () => form.reset() });
                    }}
                >
                    <div className="flex-1">
                        <Field label="Nouveau critère" error={form.errors.label}>
                            <TextInput value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} />
                        </Field>
                    </div>
                    <button type="submit" disabled={form.processing} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        Ajouter
                    </button>
                </form>
            )}
        </Card>
    );
}

import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Select } from '@/Components/Admin/Field';
import { DecisionTypeRow, toneClasses } from '@/lib/council';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    types: DecisionTypeRow[];
    categories: Record<string, string>;
    canEdit: boolean;
}

/**
 * Règles toujours appliquées, quelle que soit la table : une seule distinction (RG-08), jamais une distinction avec
 * une alerte (RG-09), une seule orientation (DEC-01). Elles sont cochées d'office et ne se décochent pas.
 */
function automatic(a: DecisionTypeRow, b: DecisionTypeRow): boolean {
    const pair = [a.category, b.category].sort().join('|');

    return pair === 'alert|distinction' || (a.category === b.category && (a.category === 'distinction' || a.category === 'orientation'));
}

export default function IncompatibilitiesTab({ types, categories, canEdit }: Props) {
    const [selectedId, setSelectedId] = useState<number>(types[0]?.id ?? 0);
    const selected = types.find((type) => type.id === selectedId);
    const saved = useMemo(() => [...(selected?.incompatible_ids ?? [])].sort((a, b) => a - b), [selected]);
    const [chosen, setChosen] = useState<number[]>(saved);
    const [processing, setProcessing] = useState(false);

    useEffect(() => setChosen(saved), [saved]);

    if (!selected) {
        return <Card className="p-6 text-sm text-ink-500">Aucun type de décision n'est encore défini.</Card>;
    }

    const dirty = [...chosen].sort((a, b) => a - b).join(',') !== saved.join(',');

    const save = () =>
        router.put(
            route('admin.council-settings.decision-types.incompatibilities', selected.id),
            { incompatible_ids: chosen },
            { preserveScroll: true, preserveState: true, onStart: () => setProcessing(true), onFinish: () => setProcessing(false) },
        );

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 p-5 lg:col-span-1">
                <h2 className="font-serif text-base font-bold text-ink-900">Règles toujours appliquées</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-ink-600">
                    <li>Une seule distinction par élève et par conseil.</li>
                    <li>Une distinction n'accompagne jamais une alerte.</li>
                    <li>Une seule décision d'orientation, et seulement au conseil de fin d'année, où elle est obligatoire.</li>
                </ul>
                <p className="text-sm text-ink-500">La table ci-contre ajoute des incompatibilités propres à l'école : une paire vaut dans les deux sens.</p>
            </Card>

            <Card className="space-y-4 p-5 lg:col-span-2">
                <Field label="Type de décision">
                    <Select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}>
                        {Object.entries(categories).map(([category, label]) => (
                            <optgroup key={category} label={label}>
                                {types
                                    .filter((type) => type.category === category)
                                    .map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.label}
                                        </option>
                                    ))}
                            </optgroup>
                        ))}
                    </Select>
                </Field>

                <fieldset>
                    <legend className="mb-3 text-sm font-medium text-ink-700">
                        Incompatible avec <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${toneClasses(selected.color)}`}>{selected.label}</span>
                    </legend>
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {types
                            .filter((type) => type.id !== selected.id)
                            .map((type) => {
                                const fixed = automatic(selected, type);
                                const checked = fixed || chosen.includes(type.id);

                                return (
                                    <label key={type.id} className={`flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm ${fixed ? 'text-ink-500' : 'text-ink-800'}`}>
                                        <Checkbox
                                            className="mt-0.5"
                                            checked={checked}
                                            disabled={fixed || !canEdit}
                                            onChange={(e) => setChosen((current) => (e.target.checked ? [...current, type.id] : current.filter((id) => id !== type.id)))}
                                        />
                                        <span>
                                            {type.label}
                                            <span className="block text-xs text-ink-500">
                                                {categories[type.category]}
                                                {fixed ? ' · règle du conseil' : ''}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                    </div>
                </fieldset>

                {canEdit && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={save}
                            disabled={!dirty || processing}
                            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Enregistrer les incompatibilités
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
}

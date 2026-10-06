import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { confirmAction } from '@/lib/confirm';
import { ThresholdSet, ThresholdValues } from '@/lib/council';
import { router, useForm } from '@inertiajs/react';
import { AlertTriangle, OctagonAlert } from 'lucide-react';
import { useState } from 'react';

type Level = 'orange' | 'red';
type FieldValues = Record<keyof ThresholdValues, string>;

interface Props {
    thresholds: { default: ThresholdSet; formations: Record<string, ThresholdSet> };
    formations: { id: number; name: string }[];
    levels: Record<Level, string>;
    sanctionLevels: Record<string, string>;
    canEdit: boolean;
}

const EMPTY: ThresholdValues = { max_average: null, unjustified_absence_hours: null, failed_subjects_count: null, progression_drop: null, sanction_level: null };

const toFields = (values: ThresholdValues | undefined): FieldValues => {
    const source = values ?? EMPTY;

    return {
        max_average: source.max_average === null ? '' : String(source.max_average),
        unjustified_absence_hours: source.unjustified_absence_hours === null ? '' : String(source.unjustified_absence_hours),
        failed_subjects_count: source.failed_subjects_count === null ? '' : String(source.failed_subjects_count),
        progression_drop: source.progression_drop === null ? '' : String(source.progression_drop),
        sanction_level: source.sanction_level ?? '',
    };
};

const toValues = (fields: FieldValues) => ({
    max_average: fields.max_average === '' ? null : Number(fields.max_average),
    unjustified_absence_hours: fields.unjustified_absence_hours === '' ? null : Number(fields.unjustified_absence_hours),
    failed_subjects_count: fields.failed_subjects_count === '' ? null : Number(fields.failed_subjects_count),
    progression_drop: fields.progression_drop === '' ? null : Number(fields.progression_drop),
    sanction_level: fields.sanction_level === '' ? null : fields.sanction_level,
});

const LEVEL_STYLE: Record<Level, { icon: typeof AlertTriangle; header: string; hours: string }> = {
    orange: { icon: AlertTriangle, header: 'bg-amber-50 text-amber-900', hours: 'à partir de' },
    red: { icon: OctagonAlert, header: 'bg-red-50 text-red-900', hours: 'plus de' },
};

function ThresholdForm({ scope, base, levels, sanctionLevels, canEdit }: { scope: string; base: ThresholdSet } & Pick<Props, 'levels' | 'sanctionLevels' | 'canEdit'>) {
    const { data, setData, put, processing, errors, transform } = useForm({
        formation_id: scope === '' ? null : Number(scope),
        orange: toFields(base.orange),
        red: toFields(base.red),
    });

    transform((values) => ({ formation_id: values.formation_id, orange: toValues(values.orange), red: toValues(values.red) }));

    const set = (level: Level, key: keyof ThresholdValues, value: string) => setData(level, { ...data[level], [key]: value });
    const error = (level: Level, key: keyof ThresholdValues) => (errors as Record<string, string>)[`${level}.${key}`];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.council-settings.alert-thresholds.update'), { preserveScroll: true, preserveState: true });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {(['orange', 'red'] as Level[]).map((level) => {
                    const { icon: Icon, header, hours } = LEVEL_STYLE[level];
                    const number = (key: keyof ThresholdValues, label: string, unit: string, step: string, max: number) => (
                        <Field label={label} error={error(level, key)}>
                            <div className="flex items-center gap-2">
                                <TextInput aria-label={`${levels[level]} — ${label} (${unit})`} type="number" inputMode="decimal" step={step} min={0} max={max} disabled={!canEdit} value={data[level][key]} onChange={(e) => set(level, key, e.target.value)} />
                                <span className="shrink-0 text-sm text-ink-500">{unit}</span>
                            </div>
                        </Field>
                    );

                    return (
                        <Card key={level} className="overflow-hidden">
                            <div className={`flex items-center gap-2 px-5 py-3 font-semibold ${header}`}>
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                {levels[level]}
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2">
                                {number('max_average', 'Moyenne générale inférieure à', '/ 20', '0.01', 20)}
                                {number('unjustified_absence_hours', `Absences non justifiées : ${hours}`, 'h', '0.5', 999)}
                                {number('failed_subjects_count', 'Matières sous 10 : à partir de', 'matières', '1', 50)}
                                {number('progression_drop', 'Baisse de la moyenne : à partir de', 'points', '0.5', 20)}
                                <div className="sm:col-span-2">
                                    <Field label="Sanction : à partir du niveau" error={error(level, 'sanction_level')}>
                                        <Select disabled={!canEdit} value={data[level].sanction_level} onChange={(e) => set(level, 'sanction_level', e.target.value)}>
                                            <option value="">Ne pas en tenir compte</option>
                                            {Object.entries(sanctionLevels).map(([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {canEdit && (
                <div className="flex justify-end">
                    <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        Enregistrer les seuils
                    </button>
                </div>
            )}
        </form>
    );
}

export default function ThresholdsTab({ thresholds, formations, levels, sanctionLevels, canEdit }: Props) {
    const [scope, setScope] = useState('');
    const own = scope === '' ? thresholds.default : thresholds.formations[scope];
    const base: ThresholdSet = {
        orange: own?.orange ?? thresholds.default.orange,
        red: own?.red ?? thresholds.default.red,
    };
    const formation = formations.find((item) => String(item.id) === scope);

    const reset = async () => {
        if (formation && (await confirmAction(`« ${formation.name} » reprendra les seuils par défaut de l'école. Continuer ?`))) {
            router.delete(route('admin.council-settings.alert-thresholds.destroy', formation.id), { preserveScroll: true, preserveState: true });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
                <div className="md:w-96">
                    <Field label="Seuils de">
                        <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                            <option value="">Toute l'école (valeurs par défaut)</option>
                            {formations.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {thresholds.formations[item.id] ? ' — seuils propres' : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
                {formation && thresholds.formations[formation.id] && canEdit && (
                    <button type="button" onClick={reset} className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Revenir aux valeurs par défaut
                    </button>
                )}
            </Card>

            <p className="text-sm text-ink-600">
                {formation && !thresholds.formations[formation.id]
                    ? `« ${formation.name} » suit les valeurs par défaut de l'école : enregistrer crée des seuils propres à cette formation.`
                    : "Un champ vide n'entre pas dans le calcul. La règle la plus grave l'emporte, et la pastille n'est qu'une aide : elle ne choisit aucune décision."}
            </p>

            <ThresholdForm key={scope} scope={scope} base={base} levels={levels} sanctionLevels={sanctionLevels} canEdit={canEdit} />
        </div>
    );
}

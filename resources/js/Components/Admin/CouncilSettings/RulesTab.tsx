import Card from '@/Components/Admin/Card';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import { CouncilRules } from '@/lib/council';
import { useForm } from '@inertiajs/react';

export default function RulesTab({ rules, canEdit }: { rules: CouncilRules; canEdit: boolean }) {
    const { data, setData, put, processing, errors } = useForm({
        double_validation: rules.double_validation,
        appeal_days: rules.appeal_days as number | '',
        default_absence_hours: rules.default_absence_hours as number | '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.council-settings.rules.update'), { preserveScroll: true, preserveState: true });
    };

    return (
        <form onSubmit={submit}>
            <Card className="max-w-2xl space-y-6 p-6">
                <label className="flex items-start gap-3 text-sm text-ink-800">
                    <Checkbox className="mt-0.5" disabled={!canEdit} checked={data.double_validation} onChange={(e) => setData('double_validation', e.target.checked)} />
                    <span>
                        <span className="font-medium">Double validation du procès-verbal</span>
                        <span className="block text-ink-500">
                            Le responsable pédagogique valide, puis la Direction valide et clôture. Décoché, la Direction valide seule.
                        </span>
                        {errors.double_validation && <span className="block text-xs text-red-600">{errors.double_validation}</span>}
                    </span>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Délai de recours des familles" error={errors.appeal_days} hint="En jours, après la notification de la décision.">
                        <TextInput type="number" min={1} max={60} disabled={!canEdit} value={data.appeal_days} onChange={(e) => setData('appeal_days', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                    <Field label="Durée d'une absence sans créneau" error={errors.default_absence_hours} hint="Heures comptées quand l'absence n'est rattachée à aucun cours de l'emploi du temps.">
                        <TextInput type="number" step="0.25" min={0.25} max={8} disabled={!canEdit} value={data.default_absence_hours} onChange={(e) => setData('default_absence_hours', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                </div>

                {canEdit && (
                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Enregistrer les règles
                        </button>
                    </div>
                )}
            </Card>
        </form>
    );
}

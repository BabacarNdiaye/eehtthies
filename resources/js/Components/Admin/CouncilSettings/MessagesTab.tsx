import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Textarea, TextInput } from '@/Components/Admin/Field';
import { CouncilRules } from '@/lib/council';
import { useForm } from '@inertiajs/react';

// Valeurs d'exemple de l'aperçu.
const SAMPLE: Record<string, string> = {
    '{eleve}': 'Awa Diop',
    '{prenom}': 'Awa',
    '{classe}': 'BTS 1 Tourisme A',
    '{periode}': 'Semestre 1',
    '{annee}': '2026-2027',
    '{lien}': 'https://www.eeht-thies.sn/espace-parent/…',
};

const render = (template: string) => Object.entries(SAMPLE).reduce((text, [key, value]) => text.split(key).join(value), template);

/** Message aux familles à la clôture (PAR-10, DIR-07) : envoi automatique, objet, texte avec mots remplacés. */
export default function MessagesTab({ rules, placeholders, canEdit }: { rules: CouncilRules; placeholders: Record<string, string>; canEdit: boolean }) {
    const { data, setData, put, processing, errors } = useForm({
        family_notify: rules.family_notify,
        family_subject: rules.family_subject,
        family_message: rules.family_message,
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                put(route('admin.council-settings.messages.update'), { preserveScroll: true, preserveState: true });
            }}
            className="grid gap-6 lg:grid-cols-3"
        >
            <Card className="space-y-5 p-6 lg:col-span-2">
                <label className="flex items-start gap-3 text-sm text-ink-800">
                    <Checkbox className="mt-0.5" disabled={!canEdit} checked={data.family_notify} onChange={(e) => setData('family_notify', e.target.checked)} />
                    <span>
                        <span className="font-medium">Prévenir automatiquement les familles à la clôture</span>
                        <span className="block text-ink-500">
                            Par e-mail, notification de l’application et EEHT Connect, selon ce dont dispose chaque famille. Décoché, la Direction prévient depuis la page du
                            conseil ; le secrétariat y trouve aussi les messages WhatsApp prêts à envoyer.
                        </span>
                    </span>
                </label>

                <Field label="Objet" required error={errors.family_subject}>
                    <TextInput disabled={!canEdit} value={data.family_subject} onChange={(e) => setData('family_subject', e.target.value)} />
                </Field>
                <Field label="Message" required error={errors.family_message} hint="N’y mettez pas le résultat : il se lit dans l’espace de la famille, à l’abri. {lien} est obligatoire.">
                    <Textarea rows={5} disabled={!canEdit} value={data.family_message} onChange={(e) => setData('family_message', e.target.value)} />
                </Field>

                {canEdit && (
                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Enregistrer le message
                        </button>
                    </div>
                )}
            </Card>

            <div className="space-y-6">
                <Card className="p-5">
                    <h2 className="mb-2 font-serif text-base font-bold text-ink-900">Mots remplacés</h2>
                    <dl className="space-y-1 text-sm">
                        {Object.entries(placeholders).map(([key, label]) => (
                            <div key={key} className="flex gap-2">
                                <dt className="font-mono text-ink-900">{key}</dt>
                                <dd className="text-ink-600">{label}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>
                <Card className="p-5">
                    <h2 className="mb-2 font-serif text-base font-bold text-ink-900">Aperçu</h2>
                    <p className="text-sm font-semibold text-ink-900">{render(data.family_subject)}</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{render(data.family_message)}</p>
                </Card>
            </div>
        </form>
    );
}

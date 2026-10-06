import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Select } from '@/Components/Admin/Field';
import { CouncilRules } from '@/lib/council';
import { useForm } from '@inertiajs/react';

export interface VoteOptions {
    functions: Record<string, string>;
    majorities: Record<string, string>;
    secrecies: Record<string, string>;
    modes: Record<string, string>;
}

/** Règles de vote du conseil (PAR-08) : qui vote, quelle majorité, voix prépondérante, secret, mode par défaut. */
export default function VoteTab({ rules, options, canEdit }: { rules: CouncilRules; options: VoteOptions; canEdit: boolean }) {
    const { data, setData, put, processing, errors } = useForm({
        vote_functions: rules.vote_functions,
        vote_majority: rules.vote_majority,
        vote_casting: rules.vote_casting,
        vote_secrecy: rules.vote_secrecy,
        vote_mode: rules.vote_mode,
    });
    const listError = errors.vote_functions ?? Object.entries(errors as Record<string, string>).find(([key]) => key.startsWith('vote_functions.'))?.[1];

    const toggle = (fn: string, on: boolean) => setData('vote_functions', on ? [...data.vote_functions, fn] : data.vote_functions.filter((item) => item !== fn));

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                put(route('admin.council-settings.vote-rules.update'), { preserveScroll: true, preserveState: true });
            }}
        >
            <Card className="max-w-2xl space-y-6 p-6">
                <fieldset>
                    <legend className="text-sm font-semibold text-ink-900">Fonctions qui votent</legend>
                    <p className="mb-2 text-sm text-ink-500">
                        Le membre doit aussi avoir le droit de vote dans son conseil. Quorum (RG-13) : la moitié des votants convoqués plus un doivent être présents.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(options.functions).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-ink-800">
                                <Checkbox disabled={!canEdit} checked={data.vote_functions.includes(key)} onChange={(e) => toggle(key, e.target.checked)} />
                                {label}
                            </label>
                        ))}
                    </div>
                    {listError && <p className="mt-1 text-xs text-red-600">{listError}</p>}
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Majorité requise" error={errors.vote_majority} hint="En majorité simple, les abstentions ne comptent pas (RG-14).">
                        <Select disabled={!canEdit} value={data.vote_majority} onChange={(e) => setData('vote_majority', e.target.value)}>
                            {Object.entries(options.majorities).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Vote" error={errors.vote_secrecy} hint="Nominatif : la Direction peut voir qui a voté quoi ; jamais au procès-verbal.">
                        <Select disabled={!canEdit} value={data.vote_secrecy} onChange={(e) => setData('vote_secrecy', e.target.value)}>
                            {Object.entries(options.secrecies).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Mode proposé au président" error={errors.vote_mode} hint="Il peut le changer à chaque vote.">
                        <Select disabled={!canEdit} value={data.vote_mode} onChange={(e) => setData('vote_mode', e.target.value)}>
                            {Object.entries(options.modes).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <label className="flex items-start gap-3 text-sm text-ink-800">
                    <Checkbox className="mt-0.5" disabled={!canEdit} checked={data.vote_casting} onChange={(e) => setData('vote_casting', e.target.checked)} />
                    <span>
                        <span className="font-medium">Voix prépondérante du président</span>
                        <span className="block text-ink-500">En cas d’égalité, le président tranche (RG-15). Décoché, l’égalité rejette la décision.</span>
                    </span>
                </label>

                {canEdit && (
                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Enregistrer les règles de vote
                        </button>
                    </div>
                )}
            </Card>
        </form>
    );
}

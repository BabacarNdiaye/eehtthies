import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Field, Textarea } from '@/Components/Admin/Field';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, FileCheck2, Link2, Upload } from 'lucide-react';
import { useState } from 'react';

interface Props {
    council: { id: number; class: string | null; term: string; year: string | null; status: string; status_label: string; general_observations: string | null; recommendations: string | null; closed_at: string | null };
    doubleValidation: boolean;
    validations: { id: number; step: string; action: string; action_label: string; user: string | null; comment: string | null; acted_at: string }[];
    versions: { id: number; version: number; number: string; sha256: string; generated_at: string; generated_by: string | null; rectification_reason: string | null; has_scan: boolean }[];
    can: { edit: boolean; submit: boolean; validatePedagogical: boolean; return: boolean; close: boolean; export: boolean; draft: boolean };
}

const keep = { preserveScroll: true } as const;
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/** Procès-verbal et validation (E07). */
export default function Minutes({ council, doubleValidation, validations, versions, can }: Props) {
    const form = useForm({ general_observations: council.general_observations ?? '', recommendations: council.recommendations ?? '' });
    const [comment, setComment] = useState('');
    const [shared, setShared] = useState<string | null>(null);
    const button = 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50';

    const post = async (name: string, question: string | null, data: Record<string, string> = {}) => {
        if (question && !(await confirmAction(question))) return;
        router.post(route(name, council.id), data, keep);
    };

    const share = async (minuteId: number) => {
        const { data } = await window.axios.get<{ url: string }>(route('admin.councils.minutes.link', [council.id, minuteId]));
        setShared(data.url);
        await navigator.clipboard?.writeText(data.url).catch(() => undefined);
    };

    return (
        <AdminLayout>
            <Head title={`PV — ${council.class ?? ''}`} />
            <p className="text-sm text-ink-500">
                <Link href={route('admin.councils.show', council.id)} className="hover:underline">
                    Conseil {council.class} · {council.term}
                </Link>
            </p>
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-2xl font-bold text-ink-900">Procès-verbal</h1>
                <CouncilStatusBadge status={council.status} label={council.status_label} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Card className="overflow-hidden">
                    {can.draft && council.status !== 'closed' ? (
                        <iframe key={`${council.general_observations}|${council.recommendations}`} title="Aperçu du procès-verbal" src={route('admin.councils.minutes.draft', council.id)} className="h-[78vh] w-full" />
                    ) : versions.length > 0 ? (
                        <div className="p-6 text-sm text-ink-700">Le procès-verbal définitif est disponible dans la liste des versions.</div>
                    ) : (
                        <div className="p-6 text-sm text-ink-500">L’aperçu du procès-verbal n’est pas disponible pour votre profil.</div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card className="space-y-4 p-5">
                        <h2 className="font-serif text-base font-bold text-ink-900">Observations et recommandations</h2>
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.put(route('admin.councils.minutes.observations', council.id), keep);
                            }}
                        >
                            <Field label="Synthèse pédagogique et observations générales" error={form.errors.general_observations}>
                                <Textarea rows={6} disabled={!can.edit} value={form.data.general_observations} onChange={(e) => form.setData('general_observations', e.target.value)} />
                            </Field>
                            <Field label="Recommandations" error={form.errors.recommendations}>
                                <Textarea rows={4} disabled={!can.edit} value={form.data.recommendations} onChange={(e) => form.setData('recommendations', e.target.value)} />
                            </Field>
                            {can.edit && (
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button type="submit" disabled={form.processing} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                        Enregistrer
                                    </button>
                                    {can.submit && (
                                        <button type="button" onClick={() => post('admin.councils.minutes.submit', 'Soumettre le procès-verbal à validation ? Enregistrez d’abord vos dernières observations.')} className={`${button} bg-ink-900 text-white hover:bg-ink-800`}>
                                            Soumettre
                                        </button>
                                    )}
                                </div>
                            )}
                        </form>
                    </Card>

                    {(can.validatePedagogical || can.close || can.return) && (
                        <Card className="space-y-3 p-5">
                            <h2 className="font-serif text-base font-bold text-ink-900">Validation</h2>
                            <p className="text-sm text-ink-600">
                                {doubleValidation ? 'Circuit à double validation : le responsable pédagogique valide, puis la Direction valide et clôture.' : 'Circuit à validation unique : la Direction valide et clôture.'}
                            </p>
                            <Field label="Commentaire" hint="Obligatoire pour renvoyer le procès-verbal en rédaction.">
                                <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                            </Field>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button type="button" onClick={() => post('admin.councils.minutes.return', null, { comment })} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                    Renvoyer avec commentaire
                                </button>
                                {can.validatePedagogical && doubleValidation && (
                                    <button type="button" onClick={() => post('admin.councils.minutes.validate', null, { comment })} className={`${button} bg-ink-900 text-white hover:bg-ink-800`}>
                                        Valider
                                    </button>
                                )}
                                {can.close && (
                                    <button
                                        type="button"
                                        onClick={() => post('admin.councils.minutes.close', 'Clôturer le conseil ? Le procès-verbal définitif sera généré et plus rien ne pourra être modifié, sauf par une rectification.', { comment })}
                                        className={`${button} bg-emerald-700 text-white hover:bg-emerald-800`}
                                    >
                                        <FileCheck2 className="h-4 w-4" aria-hidden="true" /> Valider et clôturer
                                    </button>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card className="p-5">
                        <h2 className="mb-3 font-serif text-base font-bold text-ink-900">Circuit</h2>
                        {validations.length === 0 ? (
                            <p className="text-sm text-ink-500">Pas encore soumis.</p>
                        ) : (
                            <ol className="space-y-3 text-sm">
                                {validations.map((validation) => (
                                    <li key={validation.id} className="border-l-2 border-ink-200 pl-3">
                                        <p className="font-medium text-ink-900">
                                            {validation.action_label} · {validation.step}
                                        </p>
                                        <p className="text-ink-500">
                                            {when(validation.acted_at)}
                                            {validation.user && ` — ${validation.user}`}
                                        </p>
                                        {validation.comment && <p className="mt-1 text-ink-700">« {validation.comment} »</p>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h2 className="mb-3 font-serif text-base font-bold text-ink-900">Versions définitives</h2>
                        {versions.length === 0 ? (
                            <p className="text-sm text-ink-500">Le procès-verbal définitif est généré à la clôture.</p>
                        ) : (
                            <ul className="space-y-4">
                                {versions.map((minute) => (
                                    <li key={minute.id} className="text-sm">
                                        <p className="font-semibold text-ink-900">
                                            {minute.number} — version {minute.version}
                                        </p>
                                        <p className="text-ink-500">
                                            {when(minute.generated_at)}
                                            {minute.generated_by && ` — ${minute.generated_by}`}
                                        </p>
                                        <p className="break-all font-mono text-xs text-ink-500">SHA-256 : {minute.sha256}</p>
                                        {minute.rectification_reason && <p className="text-ink-700">Rectification : {minute.rectification_reason}</p>}
                                        {can.export && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <a href={route('admin.councils.minutes.download', [council.id, minute.id])} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                                    <Download className="h-4 w-4" aria-hidden="true" /> Télécharger
                                                </a>
                                                <button type="button" onClick={() => void share(minute.id)} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                                    <Link2 className="h-4 w-4" aria-hidden="true" /> Lien 15 min
                                                </button>
                                                {minute.has_scan ? (
                                                    <a href={route('admin.councils.minutes.scan.download', [council.id, minute.id])} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                                        PV signé
                                                    </a>
                                                ) : (
                                                    <label className={`${button} cursor-pointer border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                                                        <Upload className="h-4 w-4" aria-hidden="true" /> Joindre le PV signé
                                                        <input
                                                            type="file"
                                                            accept="application/pdf,image/jpeg,image/png"
                                                            className="sr-only"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) router.post(route('admin.councils.minutes.scan', [council.id, minute.id]), { scan: file }, { ...keep, forceFormData: true });
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {shared && (
                            <p role="status" className="mt-3 break-all rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
                                Lien copié (valable 15 minutes, connexion requise) : {shared}
                            </p>
                        )}
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

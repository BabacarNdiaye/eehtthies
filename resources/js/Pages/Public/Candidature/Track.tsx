import { Field, TextInput } from '@/Components/Admin/Field';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import PublicLayout from '@/Layouts/PublicLayout';
import { formatDateLong } from '@/lib/publicFormat';
import { Candidature } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Search, User } from 'lucide-react';
import { FormEvent } from 'react';

/** Champs de saisie : 16 px sur téléphone (le navigateur ne zoome pas à la saisie), 14 px ensuite. */
const input = 'text-base sm:text-sm';

const statusPalette: Record<string, string> = {
    brouillon: 'bg-ink-100 text-ink-600',
    soumise: 'bg-blue-100 text-blue-700',
    en_cours_etude: 'bg-amber-100 text-amber-700',
    dossier_incomplet: 'bg-orange-100 text-orange-700',
    preselectionnee: 'bg-purple-100 text-purple-700',
    acceptee: 'bg-emerald-100 text-emerald-700',
    refusee: 'bg-red-100 text-red-700',
    inscription_finalisee: 'bg-gold-100 text-gold-800',
};

const statusLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    soumise: 'Soumise',
    en_cours_etude: "À l'étude",
    dossier_incomplet: 'Dossier incomplet',
    preselectionnee: 'Présélectionnée',
    acceptee: 'Acceptée',
    refusee: 'Refusée',
    inscription_finalisee: 'Inscription finalisée',
};

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                statusPalette[status] ?? 'bg-ink-100 text-ink-600'
            }`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

type TrackResult = (Candidature & { formation?: { id: number; name: string } | null }) | null;

export default function Track({
    result,
    searched,
}: {
    result?: TrackResult;
    searched?: boolean;
}) {
    const { data, setData, post, processing, errors } = useForm({
        reference: '',
        email: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('candidature.track'), { preserveScroll: true });
    };

    return (
        <PublicLayout>
            <Head title="Suivi de candidature - EEHT de Thiès" />

            <PageHero
                eyebrow="Suivi en ligne"
                title="Suivre ma candidature"
                subtitle="Renseignez votre référence de candidature et votre adresse e-mail pour connaître l'état d'avancement de votre dossier."
            />

            <section className="py-10 sm:py-24">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <Reveal>
                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-8"
                    >
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="Référence de candidature" required error={errors.reference}>
                                <TextInput
                                    type="text"
                                    placeholder="Ex : CAND-2026-0001"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    autoCapitalize="characters"
                                    autoComplete="off"
                                    aria-invalid={!!errors.reference}
                                    aria-required
                                    className={input}
                                />
                            </Field>
                            <Field label="Adresse email" required error={errors.email}>
                                <TextInput
                                    type="email"
                                    inputMode="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                    aria-required
                                    className={input}
                                />
                            </Field>
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:py-3"
                        >
                            <Search className="h-4 w-4" />
                            {processing ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>
                    </Reveal>

                    {searched && (
                        <div className="mt-8 animate-fade-in-up" role="status">
                            {result ? (
                                <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:p-8">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900">
                                                <User className="h-5 w-5 text-gold-400" />
                                            </span>
                                            <div>
                                                <h2 className="font-serif text-lg font-bold text-ink-900">
                                                    {result.first_name}{' '}
                                                    {result.last_name}
                                                </h2>
                                                <p className="text-sm text-ink-500">
                                                    Réf. {result.reference}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusPill status={result.status} />
                                    </div>

                                    <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-ink-100 pt-6 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="text-ink-500">
                                                Formation demandée
                                            </dt>
                                            <dd className="mt-1 font-medium text-ink-800">
                                                {result.formation?.name ??
                                                    '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-ink-500">
                                                Date de soumission
                                            </dt>
                                            <dd className="mt-1 font-medium text-ink-800">
                                                {formatDateLong(
                                                    result.submitted_at ??
                                                        result.created_at,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-6">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                                    <p className="text-sm text-red-700">
                                        Aucune candidature trouvée avec ces
                                        informations. Vérifiez votre
                                        référence et votre adresse e-mail, ou
                                        contactez-nous si le problème
                                        persiste.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

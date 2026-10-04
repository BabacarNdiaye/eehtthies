import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    CandidatureData,
    CandidatureErrors,
    clearDraft,
    firstStepWithError,
    LAST_STEP,
    loadDraft,
    saveDraft,
    STEPS,
    validateStep,
} from '@/lib/candidatureSteps';
import { formatBytes, shrinkImage } from '@/lib/image';
import { haptic } from '@/lib/portal';
import { Head, useForm } from '@inertiajs/react';
import { Camera, FileText, Info, Pencil, Send, UploadCloud, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';

type FormationOption = {
    id: number;
    name: string;
    diploma?: string | null;
    level?: string | null;
};

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE = /\.(pdf|jpe?g|png)$/i;

/** Champs de saisie : 16 px sur téléphone (le navigateur ne zoome pas à la saisie), 14 px ensuite. */
const input = 'text-base sm:text-sm';

/** Sur téléphone, seule l'étape courante s'affiche ; à partir de `lg` toutes les sections restent visibles. */
const shown = (step: number, current: number) => (step === current ? '' : 'hidden lg:block');

export default function CandidatureCreate({
    formations,
    selectedFormationId,
}: {
    formations: FormationOption[];
    selectedFormationId?: number | null;
}) {
    const [initial] = useState<CandidatureData>(() => {
        const draft = loadDraft();

        return {
            formation_id: selectedFormationId ? String(selectedFormationId) : (draft.formation_id ?? ''),
            first_name: draft.first_name ?? '',
            last_name: draft.last_name ?? '',
            birth_date: draft.birth_date ?? '',
            gender: draft.gender ?? '',
            email: draft.email ?? '',
            phone: draft.phone ?? '',
            address: draft.address ?? '',
            guardian_name: draft.guardian_name ?? '',
            guardian_phone: draft.guardian_phone ?? '',
            last_school: draft.last_school ?? '',
            last_diploma: draft.last_diploma ?? '',
            motivation: draft.motivation ?? '',
            documents: [],
        };
    });
    const { data, setData, post, processing, errors } = useForm<CandidatureData>(initial);
    const [step, setStep] = useState(0);
    const [stepErrors, setStepErrors] = useState<CandidatureErrors>({});
    const [fileProblems, setFileProblems] = useState<string[]>([]);
    const [preparing, setPreparing] = useState(false);
    const topRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Erreur d'un champ : celle du contrôle sur place d'abord, sinon celle du serveur.
    const errorOf = (field: keyof CandidatureData): string | undefined => stepErrors[field] ?? (errors as Record<string, string | undefined>)[field];

    // Champs texte seulement : les fichiers passent par addFiles / removeFile.
    const change = (field: Exclude<keyof CandidatureData, 'documents'>, value: string) => {
        setData(field, value);
        setStepErrors((current) => ({ ...current, [field]: undefined }));
    };

    // Le texte saisi est gardé le temps de l'onglet (jamais les fichiers).
    useEffect(() => {
        saveDraft(data);
    }, [data]);

    // Le serveur a refusé le dossier : sur téléphone, on revient à la première étape qui porte une erreur.
    useEffect(() => {
        const fields = Object.keys(errors);

        if (fields.length > 0) setStep(firstStepWithError(fields));
    }, [errors]);

    const goTo = (target: number) => {
        setStep(target);
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: 'start' }));
    };

    const focusFirstInvalid = () =>
        setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: false }), 60);

    const next = () => {
        const found = validateStep(step, data);

        setStepErrors(found);

        if (Object.keys(found).length > 0) {
            haptic(40);
            focusFirstInvalid();

            return;
        }

        haptic();
        goTo(Math.min(step + 1, LAST_STEP));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const phone = !window.matchMedia('(min-width: 1024px)').matches;

        if (phone) {
            if (step < LAST_STEP) {
                next();

                return;
            }

            // Dernier contrôle avant l'envoi : une étape passée peut avoir été vidée entre-temps.
            for (let earlier = 0; earlier < LAST_STEP; earlier++) {
                const found = validateStep(earlier, data);

                if (Object.keys(found).length > 0) {
                    setStepErrors(found);
                    goTo(earlier);
                    focusFirstInvalid();

                    return;
                }
            }
        }

        post(route('candidature.store'), { forceFormData: true, onSuccess: () => clearDraft() });
    };

    const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(event.target.files ?? []);

        event.target.value = '';

        if (picked.length === 0) return;

        const problems: string[] = [];
        const accepted: File[] = [];

        setPreparing(true);

        for (const original of picked) {
            if (!ALLOWED_FILE.test(original.name)) {
                problems.push(`${original.name} : seuls les PDF, JPG et PNG sont acceptés.`);
                continue;
            }

            const file = await shrinkImage(original);

            if (file.size > MAX_BYTES) {
                problems.push(`${file.name} dépasse 10 Mo.`);
                continue;
            }

            accepted.push(file);
        }

        setData((previous) => {
            const documents = [...previous.documents];

            for (const file of accepted) {
                if (documents.some((known) => known.name === file.name && known.size === file.size && known.lastModified === file.lastModified)) continue;

                if (documents.length >= MAX_FILES) {
                    problems.push(`Vous pouvez joindre ${MAX_FILES} documents au plus.`);
                    break;
                }

                documents.push(file);
            }

            return { ...previous, documents };
        });
        setFileProblems(problems);
        setPreparing(false);
    };

    const removeFile = (index: number) => {
        haptic();
        setData((previous) => ({ ...previous, documents: previous.documents.filter((_, position) => position !== index) }));
    };

    const formation = formations.find((option) => String(option.id) === data.formation_id);
    const hasServerErrors = Object.keys(errors).length > 0;

    return (
        <PublicLayout hideBar>
            <Head title="Candidature en ligne - EEHT de Thiès" />

            <PageHero
                eyebrow="Rejoignez l'excellence"
                title="Candidater en ligne"
                subtitle="Remplissez ce formulaire pour déposer votre dossier de candidature. Une référence de suivi vous sera communiquée à la fin de la démarche."
            />

            <section className="py-8 pb-6 sm:py-16 lg:py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div ref={topRef} className="scroll-mt-20" />

                    <div className={shown(0, step)}>
                        <Reveal className="mb-6 flex items-start gap-3 rounded-2xl bg-ink-50 p-5 sm:mb-10 sm:p-6">
                            <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
                            <p className="text-sm leading-relaxed text-ink-600">
                                {/* Téléphone : l'essentiel en deux lignes, pour que le formulaire reste dans l'écran. */}
                                <span className="sm:hidden">
                                    Première étape de l'admission. Une fois le dossier envoyé, vous recevez une référence pour suivre son avancement à tout
                                    moment.
                                </span>
                                <span className="hidden sm:inline">
                                    Cette candidature en ligne constitue la première étape du processus d'admission à l'EEHT de Thiès. Une fois votre dossier
                                    soumis, vous recevrez une référence de suivi unique vous permettant de connaître l'état d'avancement de votre candidature
                                    à tout moment. Notre équipe pédagogique étudiera votre dossier et vous contactera par téléphone ou par email pour la suite
                                    des démarches.
                                </span>
                            </p>
                        </Reveal>
                    </div>

                    <div className="mb-4 lg:hidden" aria-live="polite">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                            Étape {step + 1} sur {STEPS.length} · {STEPS[step].label}
                        </p>
                        <div
                            className="mt-2 flex gap-1.5"
                            role="progressbar"
                            aria-label="Avancement de la candidature"
                            aria-valuemin={1}
                            aria-valuemax={STEPS.length}
                            aria-valuenow={step + 1}
                        >
                            {STEPS.map((entry, index) => (
                                <span key={entry.key} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? 'bg-gold-500' : 'bg-ink-100'}`} />
                            ))}
                        </div>
                    </div>

                    <Reveal delay={100}>
                        <form
                            id="candidature-form"
                            ref={formRef}
                            onSubmit={submit}
                            noValidate
                            className="space-y-8 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:space-y-10 sm:p-10"
                        >
                            {hasServerErrors && (
                                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    Certains champs sont à corriger avant l'envoi de votre dossier.
                                </div>
                            )}

                            {/* Formation */}
                            <div className={shown(0, step)}>
                                <h2 className="font-serif text-xl font-bold text-ink-900">Formation souhaitée</h2>
                                <div className="mt-4">
                                    <Field label="Choisissez une formation" required error={errorOf('formation_id')}>
                                        <Select
                                            value={data.formation_id}
                                            onChange={(e) => change('formation_id', e.target.value)}
                                            aria-invalid={!!errorOf('formation_id')}
                                            aria-required
                                            className={input}
                                        >
                                            <option value="">-- Sélectionner une formation --</option>
                                            {formations.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                    {option.diploma ? ` (${option.diploma})` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>
                            </div>

                            {/* Identité */}
                            <div className={shown(1, step)}>
                                <h2 className="font-serif text-xl font-bold text-ink-900">Informations personnelles</h2>
                                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field label="Prénom" required error={errorOf('first_name')}>
                                        <TextInput
                                            type="text"
                                            value={data.first_name}
                                            onChange={(e) => change('first_name', e.target.value)}
                                            autoComplete="given-name"
                                            aria-invalid={!!errorOf('first_name')}
                                            aria-required
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Nom" required error={errorOf('last_name')}>
                                        <TextInput
                                            type="text"
                                            value={data.last_name}
                                            onChange={(e) => change('last_name', e.target.value)}
                                            autoComplete="family-name"
                                            aria-invalid={!!errorOf('last_name')}
                                            aria-required
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Date de naissance" error={errorOf('birth_date')}>
                                        <TextInput
                                            type="date"
                                            value={data.birth_date}
                                            onChange={(e) => change('birth_date', e.target.value)}
                                            autoComplete="bday"
                                            aria-invalid={!!errorOf('birth_date')}
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Sexe" error={errorOf('gender')}>
                                        <Select value={data.gender} onChange={(e) => change('gender', e.target.value)} aria-invalid={!!errorOf('gender')} className={input}>
                                            <option value="">-- Sélectionner --</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </Select>
                                    </Field>
                                    <Field label="Email" required error={errorOf('email')}>
                                        <TextInput
                                            type="email"
                                            inputMode="email"
                                            value={data.email}
                                            onChange={(e) => change('email', e.target.value)}
                                            autoComplete="email"
                                            aria-invalid={!!errorOf('email')}
                                            aria-required
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Téléphone" required error={errorOf('phone')}>
                                        <TextInput
                                            type="tel"
                                            inputMode="tel"
                                            value={data.phone}
                                            onChange={(e) => change('phone', e.target.value)}
                                            autoComplete="tel"
                                            aria-invalid={!!errorOf('phone')}
                                            aria-required
                                            className={input}
                                        />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Adresse" error={errorOf('address')}>
                                            <Textarea
                                                rows={2}
                                                value={data.address}
                                                onChange={(e) => change('address', e.target.value)}
                                                autoComplete="street-address"
                                                aria-invalid={!!errorOf('address')}
                                                className={input}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            {/* Tuteur et parcours */}
                            <div className={shown(2, step)}>
                                <h2 className="font-serif text-xl font-bold text-ink-900">Contact du tuteur / parent</h2>
                                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field label="Nom du tuteur / parent" error={errorOf('guardian_name')}>
                                        <TextInput
                                            type="text"
                                            value={data.guardian_name}
                                            onChange={(e) => change('guardian_name', e.target.value)}
                                            aria-invalid={!!errorOf('guardian_name')}
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Téléphone du tuteur / parent" error={errorOf('guardian_phone')}>
                                        <TextInput
                                            type="tel"
                                            inputMode="tel"
                                            value={data.guardian_phone}
                                            onChange={(e) => change('guardian_phone', e.target.value)}
                                            aria-invalid={!!errorOf('guardian_phone')}
                                            className={input}
                                        />
                                    </Field>
                                </div>

                                <h2 className="mt-8 font-serif text-xl font-bold text-ink-900 sm:mt-10">Parcours scolaire</h2>
                                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field label="Dernier établissement fréquenté" error={errorOf('last_school')}>
                                        <TextInput
                                            type="text"
                                            value={data.last_school}
                                            onChange={(e) => change('last_school', e.target.value)}
                                            aria-invalid={!!errorOf('last_school')}
                                            className={input}
                                        />
                                    </Field>
                                    <Field label="Dernier diplôme obtenu" error={errorOf('last_diploma')}>
                                        <TextInput
                                            type="text"
                                            value={data.last_diploma}
                                            onChange={(e) => change('last_diploma', e.target.value)}
                                            aria-invalid={!!errorOf('last_diploma')}
                                            className={input}
                                        />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <Field label="Lettre de motivation" error={errorOf('motivation')}>
                                            <Textarea
                                                rows={5}
                                                value={data.motivation}
                                                onChange={(e) => change('motivation', e.target.value)}
                                                placeholder="Expliquez-nous pourquoi vous souhaitez rejoindre cette formation..."
                                                aria-invalid={!!errorOf('motivation')}
                                                className={input}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div className={shown(3, step)}>
                                <h2 className="font-serif text-xl font-bold text-ink-900">Pièces justificatives</h2>
                                <p className="mt-2 text-sm text-ink-500">Bulletin, diplôme, pièce d'identité : PDF ou image, 10 Mo au plus par fichier.</p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-1">
                                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-200 px-6 py-8 text-center transition focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500 hover:border-gold-400 hover:bg-gold-50/40 sm:py-10">
                                        <UploadCloud className="h-8 w-8 text-gold-600" />
                                        <span className="text-sm font-semibold text-ink-700">Choisir des documents</span>
                                        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={addFiles} />
                                    </label>
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 focus-within:ring-2 focus-within:ring-gold-500 active:bg-ink-50 lg:hidden">
                                        <Camera className="h-5 w-5 text-gold-600" />
                                        Photographier un document
                                        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={addFiles} />
                                    </label>
                                </div>

                                <p className="mt-2 text-xs text-ink-500" aria-live="polite">
                                    {preparing ? 'Préparation des documents…' : 'Les photos trop lourdes sont allégées automatiquement avant l’envoi.'}
                                </p>

                                {fileProblems.length > 0 && (
                                    <ul role="alert" className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                        {fileProblems.map((problem) => (
                                            <li key={problem}>{problem}</li>
                                        ))}
                                    </ul>
                                )}

                                {data.documents.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {data.documents.map((file, index) => (
                                            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2 rounded-lg bg-ink-50 py-1 pl-3 pr-1 text-sm text-ink-700">
                                                <FileText className="h-4 w-4 shrink-0 text-gold-600" />
                                                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                                                <span className="shrink-0 text-xs text-ink-500">{formatBytes(file.size)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    aria-label={`Retirer ${file.name}`}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-500 active:bg-ink-100"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {Object.entries(errors)
                                    .filter(([field]) => field.startsWith('documents'))
                                    .map(([field, message]) => (
                                        <p key={field} className="mt-2 text-xs text-red-600">
                                            {message}
                                        </p>
                                    ))}

                                {/* Récapitulatif (téléphone) : dernière relecture avant l'envoi */}
                                <div className="mt-8 lg:hidden">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Vérifiez avant d'envoyer</h3>
                                    <dl className="mt-3 divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                                        {[
                                            { label: 'Formation', value: formation?.name ?? '—', edit: 0 },
                                            { label: 'Candidat', value: `${data.first_name} ${data.last_name}`.trim() || '—', edit: 1 },
                                            { label: 'E-mail', value: data.email || '—', edit: 1 },
                                            { label: 'Téléphone', value: data.phone || '—', edit: 1 },
                                            { label: 'Documents', value: data.documents.length > 0 ? `${data.documents.length} joint${data.documents.length > 1 ? 's' : ''}` : 'Aucun', edit: 3 },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                                                <dt className="w-24 shrink-0 text-ink-500">{row.label}</dt>
                                                <dd className="min-w-0 flex-1 break-words font-medium text-ink-800">{row.value}</dd>
                                                {row.edit !== 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => goTo(row.edit)}
                                                        aria-label={`Modifier : ${row.label}`}
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gold-700 active:bg-gold-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>

                            {/* Envoi (ordinateur : sous le formulaire ; téléphone : barre du bas) */}
                            <div className={`border-t border-ink-100 pt-8 ${step === LAST_STEP ? '' : 'hidden lg:block'}`}>
                                <button
                                    type="submit"
                                    disabled={processing || preparing}
                                    className="hidden w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:opacity-60 disabled:hover:translate-y-0 lg:inline-flex lg:w-auto"
                                >
                                    <Send className="h-4 w-4" />
                                    {processing ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                                </button>
                                <p className="text-xs text-ink-500 lg:mt-3">
                                    En soumettant ce formulaire, vous acceptez que vos informations soient utilisées pour traiter votre candidature,
                                    conformément à notre{' '}
                                    <a href={route('pages.privacy-policy')} className="underline hover:text-ink-700">
                                        politique de confidentialité
                                    </a>
                                    .
                                </p>
                            </div>

                        </form>
                    </Reveal>
                </div>

                {/* Barre de navigation de l'assistant (téléphone). Hors du bloc animé par Reveal : une ancêtre
                    « transform » ferait de « fixed » une position relative à elle, et non à l'écran. Le bouton
                    d'envoi se rattache donc au formulaire par son identifiant. */}
                <div
                    className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur lg:hidden"
                    style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="mx-auto flex max-w-xl gap-3">
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => goTo(step - 1)}
                                className="h-12 shrink-0 rounded-2xl border border-ink-200 px-5 text-sm font-semibold text-ink-700 active:bg-ink-50"
                            >
                                Précédent
                            </button>
                        )}
                        {step < LAST_STEP ? (
                            <button type="button" onClick={next} className="h-12 flex-1 rounded-2xl bg-gold-500 text-sm font-semibold text-ink-900 shadow-soft active:bg-gold-400">
                                Continuer
                            </button>
                        ) : (
                            <button
                                type="submit"
                                form="candidature-form"
                                disabled={processing || preparing}
                                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-500 text-sm font-semibold text-ink-900 shadow-soft active:bg-gold-400 disabled:opacity-60"
                            >
                                <Send className="h-4 w-4" />
                                {processing ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}

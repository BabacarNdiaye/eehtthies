import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import { Head, useForm } from '@inertiajs/react';
import { FileText, Info, Send, UploadCloud } from 'lucide-react';
import { FormEvent } from 'react';

type FormationOption = {
    id: number;
    name: string;
    diploma?: string | null;
    level?: string | null;
};

export default function CandidatureCreate({
    formations,
    selectedFormationId,
}: {
    formations: FormationOption[];
    selectedFormationId?: number | null;
}) {
    const { data, setData, post, processing, errors } = useForm<{
        formation_id: string;
        first_name: string;
        last_name: string;
        birth_date: string;
        gender: string;
        email: string;
        phone: string;
        address: string;
        guardian_name: string;
        guardian_phone: string;
        last_school: string;
        last_diploma: string;
        motivation: string;
        documents: File[];
    }>({
        formation_id: selectedFormationId ? String(selectedFormationId) : '',
        first_name: '',
        last_name: '',
        birth_date: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        guardian_name: '',
        guardian_phone: '',
        last_school: '',
        last_diploma: '',
        motivation: '',
        documents: [],
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('candidature.store'), { forceFormData: true });
    };

    const inputClass =
        'w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500';
    const labelClass = 'mb-1.5 block text-sm font-medium text-ink-700';
    const errorClass = 'mt-1.5 text-xs text-red-600';

    return (
        <PublicLayout>
            <Head title="Candidature en ligne - EEHT de Thiès" />

            <PageHero
                eyebrow="Rejoignez l'excellence"
                title="Candidater en ligne"
                subtitle="Remplissez ce formulaire pour déposer votre dossier de candidature. Une référence de suivi vous sera communiquée à la fin de la démarche."
            />

            <section className="py-16 sm:py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <Reveal className="mb-10 flex items-start gap-3 rounded-2xl bg-ink-50 p-6">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                        <p className="text-sm leading-relaxed text-ink-600">
                            Cette candidature en ligne constitue la première
                            étape du processus d'admission à l'EEHT de
                            Thiès. Une fois votre dossier soumis, vous
                            recevrez une référence de suivi unique vous
                            permettant de connaître l'état d'avancement de
                            votre candidature à tout moment. Notre équipe
                            pédagogique étudiera votre dossier et vous
                            contactera par téléphone ou par email pour la
                            suite des démarches.
                        </p>
                    </Reveal>

                    <Reveal delay={100}>
                    <form
                        onSubmit={submit}
                        className="space-y-10 rounded-2xl border border-ink-100 bg-white p-8 shadow-soft sm:p-10"
                    >
                        {/* Formation */}
                        <div>
                            <h2 className="font-serif text-xl font-bold text-ink-900">
                                Formation souhaitée
                            </h2>
                            <div className="mt-4">
                                <label className={labelClass}>
                                    Choisissez une formation *
                                </label>
                                <select
                                    value={data.formation_id}
                                    onChange={(e) =>
                                        setData(
                                            'formation_id',
                                            e.target.value,
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        -- Sélectionner une formation --
                                    </option>
                                    {formations.map((formation) => (
                                        <option
                                            key={formation.id}
                                            value={formation.id}
                                        >
                                            {formation.name}
                                            {formation.diploma
                                                ? ` (${formation.diploma})`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.formation_id && (
                                    <p className={errorClass}>
                                        {errors.formation_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Identity */}
                        <div>
                            <h2 className="font-serif text-xl font-bold text-ink-900">
                                Informations personnelles
                            </h2>
                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>
                                        Prénom *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.first_name}
                                        onChange={(e) =>
                                            setData(
                                                'first_name',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.first_name && (
                                        <p className={errorClass}>
                                            {errors.first_name}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.last_name}
                                        onChange={(e) =>
                                            setData(
                                                'last_name',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.last_name && (
                                        <p className={errorClass}>
                                            {errors.last_name}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Date de naissance
                                    </label>
                                    <input
                                        type="date"
                                        value={data.birth_date}
                                        onChange={(e) =>
                                            setData(
                                                'birth_date',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.birth_date && (
                                        <p className={errorClass}>
                                            {errors.birth_date}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Sexe
                                    </label>
                                    <select
                                        value={data.gender}
                                        onChange={(e) =>
                                            setData('gender', e.target.value)
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            -- Sélectionner --
                                        </option>
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                    </select>
                                    {errors.gender && (
                                        <p className={errorClass}>
                                            {errors.gender}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    {errors.email && (
                                        <p className={errorClass}>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Téléphone *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData('phone', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    {errors.phone && (
                                        <p className={errorClass}>
                                            {errors.phone}
                                        </p>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        Adresse
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={data.address}
                                        onChange={(e) =>
                                            setData('address', e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                    {errors.address && (
                                        <p className={errorClass}>
                                            {errors.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Guardian */}
                        <div>
                            <h2 className="font-serif text-xl font-bold text-ink-900">
                                Contact du tuteur / parent
                            </h2>
                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>
                                        Nom du tuteur / parent
                                    </label>
                                    <input
                                        type="text"
                                        value={data.guardian_name}
                                        onChange={(e) =>
                                            setData(
                                                'guardian_name',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.guardian_name && (
                                        <p className={errorClass}>
                                            {errors.guardian_name}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Téléphone du tuteur / parent
                                    </label>
                                    <input
                                        type="text"
                                        value={data.guardian_phone}
                                        onChange={(e) =>
                                            setData(
                                                'guardian_phone',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.guardian_phone && (
                                        <p className={errorClass}>
                                            {errors.guardian_phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Academic background */}
                        <div>
                            <h2 className="font-serif text-xl font-bold text-ink-900">
                                Parcours scolaire
                            </h2>
                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>
                                        Dernier établissement fréquenté
                                    </label>
                                    <input
                                        type="text"
                                        value={data.last_school}
                                        onChange={(e) =>
                                            setData(
                                                'last_school',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.last_school && (
                                        <p className={errorClass}>
                                            {errors.last_school}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        Dernier diplôme obtenu
                                    </label>
                                    <input
                                        type="text"
                                        value={data.last_diploma}
                                        onChange={(e) =>
                                            setData(
                                                'last_diploma',
                                                e.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    {errors.last_diploma && (
                                        <p className={errorClass}>
                                            {errors.last_diploma}
                                        </p>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        Lettre de motivation
                                    </label>
                                    <textarea
                                        rows={5}
                                        value={data.motivation}
                                        onChange={(e) =>
                                            setData(
                                                'motivation',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Expliquez-nous pourquoi vous souhaitez rejoindre cette formation..."
                                        className={inputClass}
                                    />
                                    {errors.motivation && (
                                        <p className={errorClass}>
                                            {errors.motivation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div>
                            <h2 className="font-serif text-xl font-bold text-ink-900">
                                Pièces justificatives
                            </h2>
                            <div className="mt-4">
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-200 px-6 py-10 text-center transition hover:border-gold-400 hover:bg-gold-50/40">
                                    <UploadCloud className="h-8 w-8 text-gold-500" />
                                    <span className="text-sm font-semibold text-ink-700">
                                        Cliquez pour ajouter vos documents
                                    </span>
                                    <span className="text-xs text-ink-400">
                                        Bulletin, diplôme, pièce d'identité
                                        (PDF ou image, 10 Mo max par
                                        fichier)
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) =>
                                            setData(
                                                'documents',
                                                e.target.files
                                                    ? Array.from(
                                                          e.target.files,
                                                      )
                                                    : [],
                                            )
                                        }
                                    />
                                </label>
                                {data.documents.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {data.documents.map((file, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600"
                                            >
                                                <FileText className="h-4 w-4 shrink-0 text-gold-500" />
                                                <span className="truncate">
                                                    {file.name}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {errors.documents && (
                                    <p className={errorClass}>
                                        {errors.documents}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-ink-100 pt-8">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
                            >
                                <Send className="h-4 w-4" />
                                {processing
                                    ? 'Envoi en cours...'
                                    : 'Envoyer ma candidature'}
                            </button>
                            <p className="mt-3 text-xs text-ink-400">
                                En soumettant ce formulaire, vous acceptez que vos informations soient utilisées pour
                                traiter votre candidature, conformément à notre{' '}
                                <a href={route('pages.privacy-policy')} className="underline hover:text-ink-600">
                                    politique de confidentialité
                                </a>
                                .
                            </p>
                        </div>
                    </form>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
}

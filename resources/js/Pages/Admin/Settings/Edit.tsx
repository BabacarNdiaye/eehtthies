import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea } from '@/Components/Admin/Field';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Building2 } from 'lucide-react';

// Doit refléter App\Support\ThemePalette::DEFAULTS.
const THEME_DEFAULTS = {
    neutral: '#0b1728',
    primary: '#c8942a',
    secondary: '#9c1272',
    accent: '#8bc93f',
};

const colorFields: {
    key: 'theme_neutral_color' | 'theme_primary_color' | 'theme_secondary_color' | 'theme_accent_color';
    label: string;
    hint: string;
    fallback: string;
}[] = [
    {
        key: 'theme_neutral_color',
        label: 'Couleur neutre (fonds sombres)',
        hint: 'Fond du site, en-têtes, texte principal. Choisissez une teinte foncée pour rester lisible avec du texte blanc.',
        fallback: THEME_DEFAULTS.neutral,
    },
    { key: 'theme_primary_color', label: 'Couleur principale', hint: "Boutons, titres d'accent, éléments mis en avant.", fallback: THEME_DEFAULTS.primary },
    { key: 'theme_secondary_color', label: 'Couleur secondaire', hint: 'Badges, rubans de formation, accents de marque.', fallback: THEME_DEFAULTS.secondary },
    { key: 'theme_accent_color', label: "Couleur d'accent", hint: 'Petites touches de couleur complémentaires.', fallback: THEME_DEFAULTS.accent },
];

export default function Edit({ settings }: { settings: Record<string, string> }) {
    const { data, setData, post, processing, errors } = useForm({
        site_name: settings.site_name ?? '',
        site_short_name: settings.site_short_name ?? '',
        site_tagline: settings.site_tagline ?? '',
        site_email: settings.site_email ?? '',
        site_phone: settings.site_phone ?? '',
        site_address: settings.site_address ?? '',
        opening_hours: settings.opening_hours ?? '',
        site_ninea: settings.site_ninea ?? '',
        site_rccm: settings.site_rccm ?? '',
        facebook_url: settings.facebook_url ?? '',
        instagram_url: settings.instagram_url ?? '',
        whatsapp_url: settings.whatsapp_url ?? '',
        linkedin_url: settings.linkedin_url ?? '',
        youtube_url: settings.youtube_url ?? '',
        years_experience: settings.years_experience ?? '',
        students_trained: settings.students_trained ?? '',
        success_rate: settings.success_rate ?? '',
        theme_neutral_color: settings.theme_neutral_color ?? THEME_DEFAULTS.neutral,
        theme_primary_color: settings.theme_primary_color ?? THEME_DEFAULTS.primary,
        theme_secondary_color: settings.theme_secondary_color ?? THEME_DEFAULTS.secondary,
        theme_accent_color: settings.theme_accent_color ?? THEME_DEFAULTS.accent,
        director_name: settings.director_name ?? '',
        director_role: settings.director_role ?? '',
        director_message: settings.director_message ?? '',
        logo: null as File | null,
        director_photo: null as File | null,
        about_photo: null as File | null,
    });

    const currentLogo = settings.site_logo ? `/storage/${settings.site_logo}` : null;
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const currentDirectorPhoto = settings.director_photo ? `/storage/${settings.director_photo}` : null;
    const [directorPhotoPreview, setDirectorPhotoPreview] = useState<string | null>(null);

    const currentAboutPhoto = settings.about_photo ? `/storage/${settings.about_photo}` : null;
    const [aboutPhotoPreview, setAboutPhotoPreview] = useState<string | null>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.settings.update'), { forceFormData: true });
    };

    return (
        <AdminLayout>
            <Head title="Paramètres" />
            <PageHeader
                title="Paramètres du site"
                subtitle="Configurez l'identité, les coordonnées et les informations légales de l'établissement."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Identité de l'établissement</h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Nom complet de l'école" required error={errors.site_name}>
                            <TextInput value={data.site_name} onChange={(e) => setData('site_name', e.target.value)} />
                        </Field>
                        <Field label="Nom court / sigle" required error={errors.site_short_name}>
                            <TextInput
                                value={data.site_short_name}
                                onChange={(e) => setData('site_short_name', e.target.value)}
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Slogan / accroche" error={errors.site_tagline} hint="Affiché en soutien du titre sur la page d'accueil.">
                                <TextInput
                                    value={data.site_tagline}
                                    onChange={(e) => setData('site_tagline', e.target.value)}
                                    placeholder="L'excellence hôtelière et touristique à Thiès"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center gap-5">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                            {logoPreview || currentLogo ? (
                                <img src={logoPreview ?? currentLogo ?? ''} alt="Logo" className="h-full w-full object-contain" />
                            ) : (
                                <Building2 className="h-8 w-8 text-ink-300" />
                            )}
                        </div>
                        <Field label="Logo de l'école" error={errors.logo} hint="PNG ou JPG, 2 Mo maximum. Utilisé sur le site, le back-office et les documents PDF.">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setData('logo', file);
                                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                                }}
                                className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Couleurs du site</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Personnalisez la palette utilisée sur le site public et le back-office. Les nuances claires et
                        foncées sont générées automatiquement à partir de ces 3 couleurs.
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {colorFields.map((field) => (
                            <Field key={field.key} label={field.label} error={errors[field.key]} hint={field.hint}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={data[field.key]}
                                        onChange={(e) => setData(field.key, e.target.value)}
                                        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-ink-200 p-1"
                                    />
                                    <TextInput
                                        value={data[field.key]}
                                        onChange={(e) => setData(field.key, e.target.value)}
                                        placeholder={field.fallback}
                                    />
                                </div>
                            </Field>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Coordonnées</h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="E-mail de contact" error={errors.site_email}>
                            <TextInput
                                type="email"
                                value={data.site_email}
                                onChange={(e) => setData('site_email', e.target.value)}
                            />
                        </Field>
                        <Field label="Téléphone" error={errors.site_phone}>
                            <TextInput value={data.site_phone} onChange={(e) => setData('site_phone', e.target.value)} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Adresse" error={errors.site_address}>
                                <TextInput
                                    value={data.site_address}
                                    onChange={(e) => setData('site_address', e.target.value)}
                                />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Horaires d'ouverture" error={errors.opening_hours}>
                                <Textarea
                                    rows={2}
                                    value={data.opening_hours}
                                    onChange={(e) => setData('opening_hours', e.target.value)}
                                    placeholder="Lundi - Vendredi : 8h00 - 18h00&#10;Samedi : 9h00 - 13h00"
                                />
                            </Field>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Informations légales</h2>
                    <p className="mb-4 text-sm text-ink-500">Affichées sur les documents officiels (factures, reçus, attestations).</p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="NINEA" error={errors.site_ninea}>
                            <TextInput value={data.site_ninea} onChange={(e) => setData('site_ninea', e.target.value)} />
                        </Field>
                        <Field label="RCCM" error={errors.site_rccm}>
                            <TextInput value={data.site_rccm} onChange={(e) => setData('site_rccm', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Réseaux sociaux</h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Page Facebook" error={errors.facebook_url}>
                            <TextInput
                                type="url"
                                value={data.facebook_url}
                                onChange={(e) => setData('facebook_url', e.target.value)}
                                placeholder="https://facebook.com/..."
                            />
                        </Field>
                        <Field label="Compte Instagram" error={errors.instagram_url}>
                            <TextInput
                                type="url"
                                value={data.instagram_url}
                                onChange={(e) => setData('instagram_url', e.target.value)}
                                placeholder="https://instagram.com/..."
                            />
                        </Field>
                        <Field label="WhatsApp" error={errors.whatsapp_url}>
                            <TextInput
                                type="url"
                                value={data.whatsapp_url}
                                onChange={(e) => setData('whatsapp_url', e.target.value)}
                                placeholder="https://wa.me/221..."
                            />
                        </Field>
                        <Field label="LinkedIn" error={errors.linkedin_url}>
                            <TextInput
                                type="url"
                                value={data.linkedin_url}
                                onChange={(e) => setData('linkedin_url', e.target.value)}
                                placeholder="https://linkedin.com/company/..."
                            />
                        </Field>
                        <Field label="YouTube" error={errors.youtube_url}>
                            <TextInput
                                type="url"
                                value={data.youtube_url}
                                onChange={(e) => setData('youtube_url', e.target.value)}
                                placeholder="https://youtube.com/@..."
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Statistiques affichées sur l'accueil</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Ces chiffres apparaissent dans la section « en chiffres » de la page d'accueil publique.
                        Le nombre de partenaires n'est pas réglable ici : il correspond automatiquement au nombre de
                        partenaires publiés (page Admin &gt; Partenaires).
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Nombre d'années d'expérience" error={errors.years_experience}>
                            <TextInput
                                value={data.years_experience}
                                onChange={(e) => setData('years_experience', e.target.value)}
                            />
                        </Field>
                        <Field label="Nombre d'élèves formés" error={errors.students_trained}>
                            <TextInput
                                value={data.students_trained}
                                onChange={(e) => setData('students_trained', e.target.value)}
                            />
                        </Field>
                        <Field label="Taux de réussite (%)" error={errors.success_rate}>
                            <TextInput
                                value={data.success_rate}
                                onChange={(e) => setData('success_rate', e.target.value)}
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Mot du directeur</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Affiché sur la page « À propos » du site public, avec la photo du directeur.
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Nom du directeur" error={errors.director_name}>
                            <TextInput
                                value={data.director_name}
                                onChange={(e) => setData('director_name', e.target.value)}
                                placeholder="Doudou Diankha Diop"
                            />
                        </Field>
                        <Field label="Fonction" error={errors.director_role}>
                            <TextInput
                                value={data.director_role}
                                onChange={(e) => setData('director_role', e.target.value)}
                                placeholder="Directeur Général"
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Message" error={errors.director_message} hint="Le mot d'accueil du directeur, affiché en citation.">
                                <Textarea
                                    rows={5}
                                    value={data.director_message}
                                    onChange={(e) => setData('director_message', e.target.value)}
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center gap-5">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-100 bg-ink-50">
                            {directorPhotoPreview || currentDirectorPhoto ? (
                                <img
                                    src={directorPhotoPreview ?? currentDirectorPhoto ?? ''}
                                    alt="Photo du directeur"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Building2 className="h-8 w-8 text-ink-300" />
                            )}
                        </div>
                        <Field label="Photo du directeur" error={errors.director_photo} hint="Portrait carré recommandé, 2 Mo maximum.">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setData('director_photo', file);
                                    setDirectorPhotoPreview(file ? URL.createObjectURL(file) : null);
                                }}
                                className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Photo de présentation</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Affichée sur la page d'accueil, à côté du texte de présentation de l'école.
                    </p>
                    <div className="flex items-center gap-5">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                            {aboutPhotoPreview || currentAboutPhoto ? (
                                <img
                                    src={aboutPhotoPreview ?? currentAboutPhoto ?? ''}
                                    alt="Photo de présentation"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Building2 className="h-8 w-8 text-ink-300" />
                            )}
                        </div>
                        <Field label="Photo" error={errors.about_photo} hint="Format portrait ou paysage, 4 Mo maximum.">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setData('about_photo', file);
                                    setAboutPhotoPreview(file ? URL.createObjectURL(file) : null);
                                }}
                                className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                            />
                        </Field>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        Enregistrer les paramètres
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}

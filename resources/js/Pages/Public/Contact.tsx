import { Field, Textarea, TextInput } from '@/Components/Admin/Field';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import PublicLayout from '@/Layouts/PublicLayout';
import { contactActions } from '@/lib/publicNav';
import { PageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { FormEvent } from 'react';

/** Champs de saisie : 16 px sur téléphone (le navigateur ne zoome pas à la saisie), 14 px ensuite. */
const input = 'text-base sm:text-sm';

export default function Contact() {
    const { siteSettings } = usePage<PageProps>().props;
    const actions = contactActions(siteSettings);
    const directions = actions.find((action) => action.key === 'directions');

    const { data, setData, post, processing, errors, reset, recentlySuccessful } =
        useForm({
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
        });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('contact.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <PublicLayout>
            <Head title="Contact - EEHT de Thiès" />

            <PageHero
                eyebrow="Restons en contact"
                title="Contactez-nous"
                subtitle="Une question sur nos formations, les modalités d'admission ou la vie de l'école ? Notre équipe se tient à votre disposition."
            />

            <section className="py-10 sm:py-24">
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:gap-12 sm:px-6 lg:grid-cols-5 lg:px-8">
                    {/* Colonne de gauche : carte d'informations */}
                    <Reveal className="lg:col-span-2">
                        {/* Téléphone : les moyens de joindre l'école d'un geste, avant tout formulaire. */}
                        {actions.length > 0 && (
                            <ul className="mb-6 grid grid-cols-4 gap-2 lg:hidden">
                                {actions.map((action) => (
                                    <li key={action.key}>
                                        <a
                                            href={action.href}
                                            {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                                            className="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-1 py-3 text-center text-[11px] font-semibold text-ink-700 shadow-sm outline-none active:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                                        >
                                            <action.icon className="h-5 w-5 text-gold-700" />
                                            {action.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="rounded-2xl bg-ink-900 p-6 text-white shadow-soft sm:p-8">
                            <h2 className="font-serif text-2xl font-bold">
                                Nos coordonnées
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-ink-300">
                                Retrouvez l'ensemble des moyens pour joindre
                                l'EEHT de Thiès.
                            </p>

                            <ul className="mt-6 space-y-5 text-sm sm:mt-8 sm:space-y-6">
                                {siteSettings.site_address && (
                                    <li className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                                            <MapPin className="h-5 w-5 text-gold-400" />
                                        </span>
                                        <div>
                                            <div className="font-semibold text-white">
                                                Adresse
                                            </div>
                                            <div className="mt-1 text-ink-300">
                                                {siteSettings.site_address}
                                            </div>
                                        </div>
                                    </li>
                                )}
                                {siteSettings.site_phone && (
                                    <li className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                                            <Phone className="h-5 w-5 text-gold-400" />
                                        </span>
                                        <div>
                                            <div className="font-semibold text-white">
                                                Téléphone
                                            </div>
                                            <a
                                                href={actions.find((action) => action.key === 'call')?.href}
                                                className="mt-1 inline-block text-ink-300 hover:text-white"
                                            >
                                                {siteSettings.site_phone}
                                            </a>
                                        </div>
                                    </li>
                                )}
                                {siteSettings.site_email && (
                                    <li className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                                            <Mail className="h-5 w-5 text-gold-400" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-white">
                                                Email
                                            </div>
                                            <a
                                                href={actions.find((action) => action.key === 'email')?.href}
                                                className="mt-1 inline-block break-all text-ink-300 hover:text-white"
                                            >
                                                {siteSettings.site_email}
                                            </a>
                                        </div>
                                    </li>
                                )}
                                <li className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                                        <Clock className="h-5 w-5 text-gold-400" />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-white">
                                            Horaires
                                        </div>
                                        {/* Horaires saisis dans Admin › Paramètres ; texte par défaut tant qu'ils ne le sont pas. */}
                                        <div className="mt-1 whitespace-pre-line text-ink-300">
                                            {siteSettings.opening_hours ||
                                                'Lundi - Vendredi : 8h00 - 18h00\nSamedi : 9h00 - 13h00'}
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Emplacement : lien vers l'itinéraire quand l'adresse est connue */}
                        {directions ? (
                            <a
                                href={directions.href}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-6 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-100 via-ink-50 to-white shadow-soft ring-1 ring-ink-100 outline-none transition hover:ring-gold-400 focus-visible:ring-2 focus-visible:ring-gold-500 sm:h-52"
                            >
                                <div className="text-center">
                                    <MapPin className="mx-auto h-8 w-8 text-gold-600" />
                                    <p className="mt-2 text-sm font-medium text-ink-600">
                                        Thiès, Sénégal
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-gold-700 underline underline-offset-4">
                                        Voir l'itinéraire
                                    </p>
                                </div>
                            </a>
                        ) : (
                            <div className="mt-6 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-100 via-ink-50 to-white shadow-soft ring-1 ring-ink-100 sm:h-52">
                                <div className="text-center">
                                    <MapPin className="mx-auto h-8 w-8 text-gold-600" />
                                    <p className="mt-2 text-sm font-medium text-ink-600">
                                        Thiès, Sénégal
                                    </p>
                                </div>
                            </div>
                        )}
                    </Reveal>

                    {/* Colonne de droite : formulaire */}
                    <Reveal delay={100} className="lg:col-span-3">
                        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-10">
                            {recentlySuccessful ? (
                                <div role="status" className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                                        <CheckCircle2 className="h-9 w-9 text-emerald-700" />
                                    </span>
                                    <h2 className="mt-6 font-serif text-2xl font-bold text-ink-900">
                                        Message envoyé avec succès
                                    </h2>
                                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
                                        Merci de nous avoir contactés. Notre
                                        équipe vous répondra dans les
                                        meilleurs délais.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <h2 className="font-serif text-2xl font-bold text-ink-900">
                                        Envoyez-nous un message
                                    </h2>
                                    <p className="mt-2 text-sm text-ink-500">
                                        Tous les champs marqués d'un
                                        astérisque (*) sont obligatoires.
                                    </p>

                                    <form
                                        onSubmit={submit}
                                        className="mt-6 space-y-5 sm:mt-8"
                                    >
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <Field label="Nom complet" required error={errors.name}>
                                                <TextInput
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    autoComplete="name"
                                                    aria-invalid={!!errors.name}
                                                    aria-required
                                                    className={input}
                                                />
                                            </Field>
                                            <Field label="Email" required error={errors.email}>
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

                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <Field label="Téléphone" error={errors.phone}>
                                                <TextInput
                                                    type="tel"
                                                    inputMode="tel"
                                                    value={data.phone}
                                                    onChange={(e) => setData('phone', e.target.value)}
                                                    autoComplete="tel"
                                                    aria-invalid={!!errors.phone}
                                                    className={input}
                                                />
                                            </Field>
                                            <Field label="Sujet" error={errors.subject}>
                                                <TextInput
                                                    type="text"
                                                    value={data.subject}
                                                    onChange={(e) => setData('subject', e.target.value)}
                                                    aria-invalid={!!errors.subject}
                                                    className={input}
                                                />
                                            </Field>
                                        </div>

                                        <Field label="Message" required error={errors.message}>
                                            <Textarea
                                                rows={6}
                                                value={data.message}
                                                onChange={(e) => setData('message', e.target.value)}
                                                aria-invalid={!!errors.message}
                                                aria-required
                                                className={input}
                                            />
                                        </Field>

                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:py-3"
                                        >
                                            <Send className="h-4 w-4" />
                                            {processing
                                                ? 'Envoi en cours...'
                                                : 'Envoyer le message'}
                                        </button>
                                        <p className="mt-3 text-xs text-ink-500">
                                            En envoyant ce formulaire, vous acceptez que vos informations soient
                                            utilisées pour traiter votre demande, conformément à notre{' '}
                                            <a href={route('pages.privacy-policy')} className="underline hover:text-ink-700">
                                                politique de confidentialité
                                            </a>
                                            .
                                        </p>
                                    </form>
                                </>
                            )}
                        </div>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
}

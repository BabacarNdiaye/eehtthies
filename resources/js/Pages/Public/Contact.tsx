import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import { PageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Mail, MapPin, Phone, Clock, Send, CheckCircle2 } from 'lucide-react';
import { FormEvent } from 'react';

export default function Contact() {
    const { siteSettings } = usePage<PageProps>().props;

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

            <section className="py-20 sm:py-24">
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
                    {/* Left column: info card */}
                    <Reveal className="lg:col-span-2">
                        <div className="rounded-2xl bg-ink-900 p-8 text-white shadow-soft">
                            <h2 className="font-serif text-2xl font-bold">
                                Nos coordonnées
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-ink-300">
                                Retrouvez l'ensemble des moyens pour joindre
                                l'EEHT de Thiès.
                            </p>

                            <ul className="mt-8 space-y-6 text-sm">
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
                                            <div className="mt-1 text-ink-300">
                                                {siteSettings.site_phone}
                                            </div>
                                        </div>
                                    </li>
                                )}
                                {siteSettings.site_email && (
                                    <li className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                                            <Mail className="h-5 w-5 text-gold-400" />
                                        </span>
                                        <div>
                                            <div className="font-semibold text-white">
                                                Email
                                            </div>
                                            <div className="mt-1 text-ink-300">
                                                {siteSettings.site_email}
                                            </div>
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
                                        <div className="mt-1 text-ink-300">
                                            Lundi - Vendredi : 8h00 - 18h00
                                            <br />
                                            Samedi : 9h00 - 13h00
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Static map-style placeholder */}
                        <div className="mt-6 flex h-52 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-100 via-ink-50 to-white shadow-soft ring-1 ring-ink-100">
                            <div className="text-center">
                                <MapPin className="mx-auto h-8 w-8 text-gold-500" />
                                <p className="mt-2 text-sm font-medium text-ink-500">
                                    Thiès, Sénégal
                                </p>
                            </div>
                        </div>
                    </Reveal>

                    {/* Right column: form */}
                    <Reveal delay={100} className="lg:col-span-3">
                        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-soft sm:p-10">
                            {recentlySuccessful ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                                        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                                    </span>
                                    <h3 className="mt-6 font-serif text-2xl font-bold text-ink-900">
                                        Message envoyé avec succès
                                    </h3>
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
                                        className="mt-8 space-y-5"
                                    >
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                                    Nom complet *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={(e) =>
                                                        setData(
                                                            'name',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500"
                                                />
                                                {errors.name && (
                                                    <p className="mt-1.5 text-xs text-red-600">
                                                        {errors.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                                    Email *
                                                </label>
                                                <input
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) =>
                                                        setData(
                                                            'email',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500"
                                                />
                                                {errors.email && (
                                                    <p className="mt-1.5 text-xs text-red-600">
                                                        {errors.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                                    Téléphone
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.phone}
                                                    onChange={(e) =>
                                                        setData(
                                                            'phone',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500"
                                                />
                                                {errors.phone && (
                                                    <p className="mt-1.5 text-xs text-red-600">
                                                        {errors.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                                    Sujet
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.subject}
                                                    onChange={(e) =>
                                                        setData(
                                                            'subject',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500"
                                                />
                                                {errors.subject && (
                                                    <p className="mt-1.5 text-xs text-red-600">
                                                        {errors.subject}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-ink-700">
                                                Message *
                                            </label>
                                            <textarea
                                                rows={6}
                                                value={data.message}
                                                onChange={(e) =>
                                                    setData(
                                                        'message',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border-ink-200 text-sm focus:border-gold-500 focus:ring-gold-500"
                                            />
                                            {errors.message && (
                                                <p className="mt-1.5 text-xs text-red-600">
                                                    {errors.message}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:opacity-60 disabled:hover:translate-y-0"
                                        >
                                            <Send className="h-4 w-4" />
                                            {processing
                                                ? 'Envoi en cours...'
                                                : 'Envoyer le message'}
                                        </button>
                                        <p className="mt-3 text-xs text-ink-400">
                                            En envoyant ce formulaire, vous acceptez que vos informations soient
                                            utilisées pour traiter votre demande, conformément à notre{' '}
                                            <a href={route('pages.privacy-policy')} className="underline hover:text-ink-600">
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

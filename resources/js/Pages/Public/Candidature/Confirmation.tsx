import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Mail, Search, Home as HomeIcon } from 'lucide-react';

export default function Confirmation({
    candidature,
}: {
    candidature: {
        reference: string;
        first_name: string;
        last_name: string;
        email: string;
        status: string;
    };
}) {
    return (
        <PublicLayout>
            <Head title="Candidature envoyée - EEHT de Thiès" />

            <section className="relative overflow-hidden bg-ink-900 py-24 sm:py-28">
                <div
                    className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-2xl animate-fade-in-up px-4 text-center sm:px-6 lg:px-8">
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckCircle2 className="h-11 w-11 text-emerald-400" />
                    </span>

                    <h1 className="mt-8 font-serif text-3xl font-bold text-white sm:text-4xl">
                        Votre candidature a bien été envoyée
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-ink-300">
                        Merci {candidature.first_name}{' '}
                        {candidature.last_name}, votre dossier a été transmis
                        avec succès à l'EEHT de Thiès. Notre équipe
                        pédagogique va l'étudier avec attention.
                    </p>

                    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">
                            Votre référence de suivi
                        </p>
                        <p className="mt-3 select-all rounded-lg bg-ink-950 px-4 py-3 font-mono text-xl font-bold tracking-wider text-white">
                            {candidature.reference}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-ink-400">
                            Conservez précieusement cette référence : elle
                            vous permettra de suivre l'état de votre
                            candidature à tout moment.
                        </p>
                    </div>

                    <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-sm text-ink-300">
                        <Mail className="h-4 w-4 text-gold-400" />
                        Une confirmation a été notée pour l'adresse{' '}
                        <span className="font-semibold text-white">
                            {candidature.email}
                        </span>
                    </div>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            href={route('candidature.track.form')}
                            className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400"
                        >
                            <Search className="h-4 w-4" />
                            Suivre ma candidature
                        </Link>
                        <Link
                            href={route('home')}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                        >
                            <HomeIcon className="h-4 w-4" />
                            Retour à l'accueil
                        </Link>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}

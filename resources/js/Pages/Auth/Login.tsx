import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import SiteLogo from '@/Components/SiteLogo';
import { ArrowRight } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    // Écran d'accueil façon application, sur téléphone uniquement ; il est ignoré dès qu'il y a un message ou une erreur à montrer.
    const [started, setStarted] = useState(false);
    const showSplash = !started && !status && !errors.email && !errors.password;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            {showSplash && (
                <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-ink-950 via-ink-900 to-leaf-900 px-6 pb-10 pt-16 text-white sm:hidden">
                    <span className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-leaf-500/20 blur-3xl" />
                    <span className="pointer-events-none absolute -left-20 bottom-32 h-72 w-72 rounded-full bg-leaf-400/10 blur-3xl" />
                    <SiteLogo size={56} tone="gold" />
                    <div className="relative">
                        <h1 className="font-serif text-4xl font-bold leading-tight">Votre école, simplement.</h1>
                        <p className="mt-3 text-base text-white/70">Emploi du temps, notes, paiements et messages, accessibles partout.</p>
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => setStarted(true)}
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-leaf-500 text-base font-bold text-ink-900 shadow-lg shadow-leaf-500/30 transition-transform active:scale-[0.98]"
                        >
                            Commencer <ArrowRight className="h-5 w-5" />
                        </button>
                        <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
                            <span className="h-1.5 w-6 rounded-full bg-leaf-400" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                        </div>
                    </div>
                </div>
            )}
        <GuestLayout>
            <Head title="Connexion" />

            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Connexion</h1>
            <p className="mb-6 text-sm text-ink-500">Accédez à votre espace personnel.</p>

            {status && (
                <div className="mb-4 text-sm font-medium text-emerald-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Adresse e-mail" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Mot de passe" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <PrimaryButton
                    className="mt-6 w-full !justify-center rounded-full bg-leaf-500 py-3 !text-ink-900 hover:bg-leaf-400 focus:ring-leaf-600"
                    disabled={processing}
                >
                    Se connecter
                </PrimaryButton>

                {canResetPassword && (
                    <div className="mt-4 text-center">
                        <Link
                            href={route('password.request')}
                            className="text-sm text-ink-500 hover:text-ink-900"
                        >
                            Mot de passe oublié ?
                        </Link>
                    </div>
                )}
            </form>
        </GuestLayout>
        </>
    );
}

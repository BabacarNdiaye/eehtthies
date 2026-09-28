import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Vérification de l'e-mail" />

            <h1 className="mb-4 text-center font-serif text-xl font-bold text-ink-900">
                Vérification de l'e-mail
            </h1>

            <div className="mb-4 text-sm text-ink-600">
                Merci de votre inscription ! Avant de commencer, pourriez-vous vérifier votre adresse
                e-mail en cliquant sur le lien que nous venons de vous envoyer ? Si vous n'avez rien
                reçu, nous pouvons vous en renvoyer un.
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-emerald-600">
                    Un nouveau lien de vérification a été envoyé à l'adresse e-mail fournie lors de
                    l'inscription.
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex items-center justify-between">
                    <PrimaryButton disabled={processing}>
                        Renvoyer l'e-mail de vérification
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-ink-500 underline hover:text-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                    >
                        Se déconnecter
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}

import PortalLayout from '@/Layouts/PortalLayout';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import { studentNav } from './Dashboard';
import { Head } from '@inertiajs/react';

export default function Password() {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mot de passe" />

            <div className="mx-auto max-w-xl rounded-xl border border-ink-100 bg-white p-6 sm:p-8">
                <UpdatePasswordForm />
            </div>
        </PortalLayout>
    );
}

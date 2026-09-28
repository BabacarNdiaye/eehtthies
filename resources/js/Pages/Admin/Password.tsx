import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import { Head } from '@inertiajs/react';

export default function Password() {
    return (
        <AdminLayout>
            <Head title="Mot de passe" />
            <PageHeader title="Mot de passe" subtitle="Modifiez le mot de passe de votre compte." />

            <Card className="max-w-xl p-6 sm:p-8">
                <UpdatePasswordForm />
            </Card>
        </AdminLayout>
    );
}

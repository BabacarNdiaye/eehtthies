import PortalLayout from '@/Layouts/PortalLayout';
import Inbox from '@/Components/Messaging/Inbox';
import { Head } from '@inertiajs/react';
import { studentNav } from './Dashboard';

export default function Messages() {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Messages" />
            <div className="mb-6">
                <h1 className="font-serif text-2xl font-bold text-ink-900">Messages</h1>
                <p className="mt-1 text-sm text-ink-500">Vos échanges avec l'administration et vos enseignants.</p>
            </div>
            <Inbox />
        </PortalLayout>
    );
}

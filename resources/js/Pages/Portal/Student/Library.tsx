import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import LibraryBrowser, { LibraryResourceRow } from '@/Components/Library/LibraryBrowser';
import { Head } from '@inertiajs/react';

export default function Library({ resources }: { resources: LibraryResourceRow[] }) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Bibliothèque" />
            <div className="mb-6">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">Bibliothèque</h1>
                <p className="mt-1 text-sm text-ink-500">Ressources partagées par l'équipe pédagogique.</p>
            </div>

            <LibraryBrowser resources={resources} />
        </PortalLayout>
    );
}

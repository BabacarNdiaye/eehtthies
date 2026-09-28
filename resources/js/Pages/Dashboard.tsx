import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-serif text-xl font-bold leading-tight text-ink-900">
                    Tableau de bord
                </h2>
            }
        >
            <Head title="Tableau de bord" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="p-6 text-ink-700">
                            Votre compte n'est associé à aucun espace spécifique pour le moment.
                            Contactez l'administration si vous pensez qu'il s'agit d'une erreur.
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

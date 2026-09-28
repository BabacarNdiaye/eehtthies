import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import Card from '@/Components/Admin/Card';
import { Student } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronRight, GraduationCap } from 'lucide-react';

export const parentNav: PortalNavItem[] = [
    { label: 'Mes enfants', href: 'parent.dashboard', active: (c) => c === 'parent.dashboard' || c === 'parent.child' },
    { label: 'Messages', href: 'parent.messages', active: (c) => c === 'parent.messages' },
    { label: 'Annuaire', href: 'directory.index', active: (c) => c === 'directory.index' },
];

type ChildRow = Student & {
    formation?: { id: number; name: string } | null;
    schoolClass?: { id: number; name: string } | null;
};

export default function Dashboard({ children }: { children: ChildRow[] }) {
    return (
        <PortalLayout title="Espace Parent" nav={parentNav}>
            <Head title="Mes enfants" />
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Mes enfants</h1>
            <p className="mb-6 text-sm text-ink-500">
                Suivez la scolarité de vos enfants : notes, bulletins, présences et emploi du temps.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {children.map((child) => (
                    <Link
                        key={child.id}
                        href={route('parent.child', child.id)}
                        className="block rounded-xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-gold-300 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 font-serif text-lg font-bold text-gold-400">
                                    {child.first_name.charAt(0)}
                                    {child.last_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-serif text-lg font-bold text-ink-900">
                                        {child.first_name} {child.last_name}
                                    </p>
                                    <p className="text-sm text-ink-500">
                                        {child.formation?.name} {child.schoolClass ? `— ${child.schoolClass.name}` : ''}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-ink-300" />
                        </div>
                    </Link>
                ))}
                {children.length === 0 && (
                    <Card className="p-10 text-center text-ink-400 sm:col-span-2">
                        <GraduationCap className="mx-auto mb-3 h-8 w-8 text-ink-300" />
                        Aucun enfant n'est encore associé à votre compte. Contactez l'administration de l'école.
                    </Card>
                )}
            </div>
        </PortalLayout>
    );
}

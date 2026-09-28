import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Role } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Lock, Pencil, Trash2 } from 'lucide-react';

interface Props {
    roles: Role[];
    protectedRoles: string[];
}

export default function Index({ roles, protectedRoles }: Props) {
    const destroy = (role: Role) => {
        if (confirm(`Supprimer le rôle "${role.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.roles.destroy', role.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Rôles & permissions" />
            <PageHeader
                title="Rôles & permissions"
                subtitle="Gérez les profils d'accès et les permissions associées à chaque module de la plateforme."
                action={{ label: 'Nouveau rôle', href: route('admin.roles.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Rôle</th>
                                <th className="px-5 py-3">Permissions</th>
                                <th className="px-5 py-3">Utilisateurs</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {roles.map((role) => {
                                const isProtected = protectedRoles.includes(role.name);
                                return (
                                    <tr key={role.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-ink-900">{role.name}</span>
                                                {isProtected && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-800">
                                                        <Lock className="h-3 w-3" /> Système
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{role.permissions_count ?? 0}</td>
                                        <td className="px-5 py-3 text-ink-600">{role.users_count ?? 0}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Link href={route('admin.roles.edit', role.id)} className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100">
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                {!isProtected && (
                                                    <button
                                                        onClick={() => destroy(role)}
                                                        disabled={(role.users_count ?? 0) > 0}
                                                        title={(role.users_count ?? 0) > 0 ? 'Réaffectez les utilisateurs avant suppression' : undefined}
                                                        className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {roles.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Lock className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun rôle enregistré.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}

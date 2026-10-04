import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { RoleDetail } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';

interface Props {
    role?: RoleDetail | null;
    modules: Record<string, string>;
    actions: Record<string, string>;
    isProtected: boolean;
}

export default function Form({ role, modules, actions, isProtected }: Props) {
    const isEdit = !!role;

    const { data, setData, post, put, processing, errors } = useForm({
        name: role?.name ?? '',
        permissions: role?.permissions ?? ([] as string[]),
    });

    const permissionName = (action: string, module: string) => `${action}_${module}`;

    const isChecked = (action: string, module: string) => data.permissions.includes(permissionName(action, module));

    const toggleCell = (action: string, module: string) => {
        const name = permissionName(action, module);
        setData('permissions', isChecked(action, module) ? data.permissions.filter((p) => p !== name) : [...data.permissions, name]);
    };

    const toggleRow = (module: string) => {
        const rowPermissions = Object.keys(actions).map((action) => permissionName(action, module));
        const allChecked = rowPermissions.every((p) => data.permissions.includes(p));
        setData(
            'permissions',
            allChecked
                ? data.permissions.filter((p) => !rowPermissions.includes(p))
                : [...new Set([...data.permissions, ...rowPermissions])],
        );
    };

    const toggleColumn = (action: string) => {
        const columnPermissions = Object.keys(modules).map((module) => permissionName(action, module));
        const allChecked = columnPermissions.every((p) => data.permissions.includes(p));
        setData(
            'permissions',
            allChecked
                ? data.permissions.filter((p) => !columnPermissions.includes(p))
                : [...new Set([...data.permissions, ...columnPermissions])],
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.roles.update', role!.id));
        } else {
            post(route('admin.roles.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le rôle' : 'Nouveau rôle'} />
            <PageHeader
                title={isEdit ? 'Modifier le rôle' : 'Nouveau rôle'}
                subtitle="Définissez le nom du rôle et les permissions accordées pour chaque module."
            />

            {isProtected && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-gold-50 px-4 py-3 text-sm font-medium text-gold-800">
                    <Lock className="h-4 w-4" /> Ce rôle système conserve automatiquement toutes les permissions et ne peut pas être renommé.
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <Card className="p-6">
                    <Field label="Nom du rôle" required error={errors.name} hint="Lettres minuscules, chiffres et tirets uniquement (ex: responsable-cuisine).">
                        <TextInput
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={isProtected}
                            className="max-w-sm"
                        />
                    </Field>
                </Card>

                {!isProtected && (
                    <Card className="overflow-hidden">
                        <div className="border-b border-ink-100 p-5">
                            <h2 className="font-serif text-lg font-semibold text-ink-900">Permissions par module</h2>
                            <p className="mt-1 text-sm text-ink-500">Cochez les actions autorisées pour ce rôle, module par module.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table data-table="scroll" className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="sticky left-0 bg-ink-50 px-5 py-3">Module</th>
                                        {Object.entries(actions).map(([action, label]) => (
                                            <th key={action} className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleColumn(action)}
                                                    className="hover:text-gold-700"
                                                    title={`Basculer « ${label} » pour tous les modules`}
                                                >
                                                    {label}
                                                </button>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {Object.entries(modules).map(([module, label]) => (
                                        <tr key={module} className="transition-colors duration-150 hover:bg-ink-50/60">
                                            <td className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink-800 hover:bg-ink-50/60">
                                                <button type="button" onClick={() => toggleRow(module)} className="text-left hover:text-gold-700">
                                                    {label}
                                                </button>
                                            </td>
                                            {Object.keys(actions).map((action) => (
                                                <td key={action} className="px-3 py-2.5 text-center">
                                                    <Checkbox
                                                        aria-label={`${actions[action]} — ${label}`}
                                                        checked={isChecked(action, module)}
                                                        onChange={() => toggleCell(action, module)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le rôle'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}

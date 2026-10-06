import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Checkbox, Select } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import PayoutFields from '@/Components/Admin/PayoutFields';
import { User } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { ChangeEvent, useState } from 'react';

type EditableUser = User & { roles: { id: number; name: string }[] };
type Manager = { id: number; name: string; position: string | null };
/** Mode et compte de versement : envoyés seulement à ceux qui peuvent modifier les salaires. */
type Payout = { channel: string | null; account: string | null; options: Record<string, string> };

export default function Form({
    editUser,
    roles,
    managers,
    payout,
}: {
    editUser?: EditableUser;
    roles: string[];
    managers: Manager[];
    payout?: Payout;
}) {
    const isEdit = !!editUser;
    const currentRoleNames = editUser?.roles.map((r) => r.name) ?? [];
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const currentAvatar = editUser?.avatar ? `/storage/${editUser.avatar}` : null;

    const { data, setData, post, transform, processing, errors } = useForm({
        name: editUser?.name ?? '',
        email: editUser?.email ?? '',
        personal_email: editUser?.personal_email ?? '',
        phone: editUser?.phone ?? '',
        position: editUser?.position ?? '',
        department: editUser?.department ?? '',
        hire_date: editUser?.hire_date?.slice(0, 10) ?? '',
        monthly_salary: editUser?.monthly_salary != null ? String(editUser.monthly_salary) : '',
        payout_channel: payout?.channel ?? '',
        payout_account: payout?.account ?? '',
        manager_id: editUser?.manager_id ? String(editUser.manager_id) : '',
        password: '',
        is_active: editUser?.is_active ?? true,
        roles: currentRoleNames as string[],
        avatar: null as File | null,
    });

    const toggleRole = (role: string, checked: boolean) => {
        if (checked) {
            setData('roles', [...data.roles, role]);
        } else {
            setData('roles', data.roles.filter((r) => r !== role));
        }
    };

    const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('avatar', file);
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            // POST + simulation de _method : PHP n'analyse pas les corps multipart des requêtes PUT/PATCH.
            transform((data) => ({ ...data, _method: 'put' }));
            post(route('admin.users.update', editUser!.id), { forceFormData: true });
        } else {
            post(route('admin.users.store'), { forceFormData: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le membre du personnel' : 'Nouveau membre du personnel'} />
            <PageHeader
                title={isEdit ? 'Modifier le membre du personnel' : 'Nouveau membre du personnel'}
                subtitle="Renseignez les informations du compte, sa fonction et ses rôles."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="p-6">
                    <div className="mb-5 flex items-center gap-5">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-100 bg-ink-50">
                            {avatarPreview || currentAvatar ? (
                                <img
                                    src={avatarPreview ?? currentAvatar ?? ''}
                                    alt="Photo"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <UserRound className="h-8 w-8 text-ink-300" />
                            )}
                        </div>
                        <Field label="Photo" error={errors.avatar} hint="Portrait carré recommandé, 2 Mo maximum.">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={onAvatarChange}
                                className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Nom complet" required error={errors.name}>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </Field>
                        <Field
                            label="E-mail professionnel"
                            required={isEdit}
                            error={errors.email}
                            hint={isEdit ? 'Utilisé pour la connexion.' : 'Laisser vide pour générer automatiquement une adresse @eeht-thies.sn unique.'}
                        >
                            <TextInput
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </Field>
                        <Field label="E-mail personnel" error={errors.personal_email}>
                            <TextInput
                                type="email"
                                value={data.personal_email}
                                onChange={(e) => setData('personal_email', e.target.value)}
                            />
                        </Field>
                        <Field label="Téléphone" error={errors.phone}>
                            <TextInput value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                        </Field>
                        <Field
                            label="Mot de passe"
                            required={!isEdit}
                            error={errors.password}
                            hint={isEdit ? 'Laisser vide pour ne pas changer le mot de passe.' : undefined}
                        >
                            <TextInput
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                        </Field>
                        <Field label="Fonction" error={errors.position} hint="Ex : Comptable, Responsable communication...">
                            <TextInput value={data.position} onChange={(e) => setData('position', e.target.value)} />
                        </Field>
                        <Field label="Service / département" error={errors.department}>
                            <TextInput value={data.department} onChange={(e) => setData('department', e.target.value)} />
                        </Field>
                        <Field label="Date d'embauche" error={errors.hire_date}>
                            <TextInput
                                type="date"
                                value={data.hire_date}
                                onChange={(e) => setData('hire_date', e.target.value)}
                            />
                        </Field>
                        <Field label="Salaire mensuel" error={errors.monthly_salary} hint="En FCFA. Utilisé comme montant par défaut lors du paiement.">
                            <TextInput
                                type="number"
                                min="0"
                                step="1"
                                value={data.monthly_salary}
                                onChange={(e) => setData('monthly_salary', e.target.value)}
                            />
                        </Field>
                        {payout && (
                            <PayoutFields
                                channel={data.payout_channel}
                                account={data.payout_account}
                                options={payout.options}
                                errors={errors}
                                onChange={(field, value) => setData(field, value)}
                            />
                        )}
                        <Field label="Supérieur hiérarchique" error={errors.manager_id} hint="Utilisé pour construire l'organigramme.">
                            <Select value={data.manager_id} onChange={(e) => setData('manager_id', e.target.value)}>
                                <option value="">Aucun (sommet de la hiérarchie)</option>
                                {managers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                        {m.position ? ` — ${m.position}` : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Rôles</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {roles.map((role) => (
                            <label key={role} className="flex items-center gap-2 text-sm text-ink-700">
                                <Checkbox
                                    checked={data.roles.includes(role)}
                                    onChange={(e) => toggleRole(role, e.target.checked)}
                                />
                                {role}
                            </label>
                        ))}
                        {roles.length === 0 && (
                            <p className="text-sm text-ink-500">Aucun rôle disponible.</p>
                        )}
                    </div>
                    {errors.roles && <p className="mt-2 text-xs text-red-600">{errors.roles}</p>}
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Compte actif
                    </label>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le membre du personnel'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}

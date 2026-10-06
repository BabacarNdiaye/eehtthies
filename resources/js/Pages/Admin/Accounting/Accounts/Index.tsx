import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput, Checkbox } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface AccountRow {
    id: number;
    code: string;
    name: string;
    class: number;
    nature: string;
    is_active: boolean;
}

interface Props {
    accounts: AccountRow[];
    natures: Record<string, string>;
    filters: { class?: string; search?: string };
}

const natureStyles: Record<string, string> = {
    actif: 'bg-blue-100 text-blue-700',
    passif: 'bg-purple-100 text-purple-700',
    charge: 'bg-red-100 text-red-700',
    produit: 'bg-emerald-100 text-emerald-700',
};

export default function Index({ accounts, natures, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const createForm = useForm({ code: '', name: '', class: 6, nature: 'charge', is_active: true });
    const editForm = useForm({ code: '', name: '', class: 6, nature: 'charge', is_active: true });

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.accounting.accounts.index'), { search, class: filters.class ?? '', ...overrides }, { preserveState: true, replace: true });
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.accounting.accounts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
            },
        });
    };

    const startEdit = (account: AccountRow) => {
        setEditingId(account.id);
        editForm.setData({ code: account.code, name: account.name, class: account.class, nature: account.nature, is_active: account.is_active });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.accounting.accounts.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (account: AccountRow) => {
        if (await confirmAction(`Supprimer le compte "${account.code} — ${account.name}" ?`)) {
            router.delete(route('admin.accounting.accounts.destroy', account.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Plan comptable" />
            <PageHeader
                title="Plan comptable"
                subtitle="Comptes du système comptable SYSCOHADA utilisés pour les écritures."
            />
            <AccountingTabs current="accounts" />

            <div className="mb-6 flex justify-end">
                <button
                    type="button"
                    onClick={() => setShowCreate((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    {showCreate ? 'Fermer' : 'Nouveau compte'}
                </button>
            </div>

            {showCreate && (
                <Card className="mb-6 p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Nouveau compte</h2>
                    <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
                        <Field label="Code" required error={createForm.errors.code}>
                            <TextInput value={createForm.data.code} onChange={(e) => createForm.setData('code', e.target.value)} placeholder="601000" />
                        </Field>
                        <Field label="Intitulé" required error={createForm.errors.name}>
                            <TextInput value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                        </Field>
                        <Field label="Classe" required error={createForm.errors.class}>
                            <Select value={createForm.data.class} onChange={(e) => createForm.setData('class', Number(e.target.value))}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
                                    <option key={c} value={c}>Classe {c}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Nature" required error={createForm.errors.nature}>
                            <Select value={createForm.data.nature} onChange={(e) => createForm.setData('nature', e.target.value)}>
                                {Object.entries(natures).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Select>
                        </Field>
                        <button type="submit" disabled={createForm.processing} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Ajouter
                        </button>
                    </form>
                </Card>
            )}

            <FilterBar
                search={
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un code ou un intitulé..."
                    />
                }
                activeCount={[filters.class].filter(Boolean).length}
            >
                <Select aria-label="Filtrer par classe" value={filters.class ?? ''} onChange={(e) => applyFilters({ class: e.target.value })}>
                    <option value="">Toutes les classes</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
                        <option key={c} value={c}>Classe {c}</option>
                    ))}
                </Select>
            </FilterBar>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Intitulé</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Nature</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {accounts.map((account) =>
                                editingId === account.id ? (
                                    <tr key={account.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={6}>
                                            <form onSubmit={(e) => submitEdit(e, account.id)} className="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:items-end">
                                                <TextInput aria-label="Code" value={editForm.data.code} onChange={(e) => editForm.setData('code', e.target.value)} />
                                                <TextInput aria-label="Nom" value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} className="sm:col-span-2" />
                                                <Select aria-label="Classe" value={editForm.data.class} onChange={(e) => editForm.setData('class', Number(e.target.value))}>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
                                                        <option key={c} value={c}>Classe {c}</option>
                                                    ))}
                                                </Select>
                                                <Select aria-label="Nature" value={editForm.data.nature} onChange={(e) => editForm.setData('nature', e.target.value)}>
                                                    {Object.entries(natures).map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </Select>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-1.5 text-xs text-ink-700">
                                                        <Checkbox checked={editForm.data.is_active} onChange={(e) => editForm.setData('is_active', e.target.checked)} />
                                                        Actif
                                                    </label>
                                                    <button type="submit" disabled={editForm.processing} className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                                                        OK
                                                    </button>
                                                    <IconButton type="button" onClick={() => setEditingId(null)} label="Annuler la modification">
                                                        <X className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={account.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-mono text-ink-900">{account.code}</td>
                                        <td className="px-5 py-3 font-medium text-ink-900">{account.name}</td>
                                        <td className="px-5 py-3 text-ink-500">Classe {account.class}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${natureStyles[account.nature]}`}>
                                                {natures[account.nature]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {!account.is_active && (
                                                <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">Inactif</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <IconButton onClick={() => startEdit(account)} label="Modifier">
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton onClick={() => destroy(account)} label="Supprimer" tone="danger">
                                                    <Trash2 className="h-4 w-4" />
                                                </IconButton>
                                            </div>
                                        </td>
                                    </tr>
                                ),
                            )}
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun compte trouvé.</p>
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

import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea } from '@/Components/Admin/Field';
import { Supplier } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function Index({ suppliers }: { suppliers: Supplier[] }) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const emptyData = { name: '', contact_name: '', phone: '', email: '', address: '' };
    const createForm = useForm(emptyData);
    const editForm = useForm(emptyData);

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.suppliers.store'), { preserveScroll: true, onSuccess: () => createForm.reset() });
    };

    const startEdit = (supplier: Supplier) => {
        setEditingId(supplier.id);
        editForm.setData({
            name: supplier.name,
            contact_name: supplier.contact_name ?? '',
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            address: supplier.address ?? '',
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.suppliers.update', id), { preserveScroll: true, onSuccess: () => setEditingId(null) });
    };

    const destroy = (supplier: Supplier) => {
        if (confirm(`Supprimer le fournisseur "${supplier.name}" ?`)) {
            router.delete(route('admin.suppliers.destroy', supplier.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Fournisseurs" />
            <PageHeader title="Fournisseurs" subtitle="Gérez les fournisseurs de produits et de matériel." />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter un fournisseur</h2>
                <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
                    <Field label="Nom" required error={createForm.errors.name}>
                        <TextInput value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} />
                    </Field>
                    <Field label="Contact" error={createForm.errors.contact_name}>
                        <TextInput value={createForm.data.contact_name} onChange={(e) => createForm.setData('contact_name', e.target.value)} />
                    </Field>
                    <Field label="Téléphone" error={createForm.errors.phone}>
                        <TextInput value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                    </Field>
                    <Field label="E-mail" error={createForm.errors.email}>
                        <TextInput type="email" value={createForm.data.email} onChange={(e) => createForm.setData('email', e.target.value)} />
                    </Field>
                    <button type="submit" disabled={createForm.processing} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        Ajouter
                    </button>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Nom</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Téléphone</th>
                                <th className="px-5 py-3">Produits liés</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {suppliers.map((s) =>
                                editingId === s.id ? (
                                    <tr key={s.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={5}>
                                            <form onSubmit={(e) => submitEdit(e, s.id)} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
                                                <TextInput value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} />
                                                <TextInput value={editForm.data.contact_name} onChange={(e) => editForm.setData('contact_name', e.target.value)} />
                                                <TextInput value={editForm.data.phone} onChange={(e) => editForm.setData('phone', e.target.value)} />
                                                <TextInput type="email" value={editForm.data.email} onChange={(e) => editForm.setData('email', e.target.value)} />
                                                <div className="flex gap-2">
                                                    <button type="submit" disabled={editForm.processing} className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800">
                                                        Enregistrer
                                                    </button>
                                                    <button type="button" onClick={() => setEditingId(null)} className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-medium text-ink-900">{s.name}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.contact_name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.phone ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.products_count ?? 0}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => startEdit(s)} className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => destroy(s)} className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ),
                            )}
                            {suppliers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun fournisseur enregistré.</p>
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

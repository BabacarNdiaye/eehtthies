import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Select, TextInput } from '@/Components/Admin/Field';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Entry {
    id: number;
    at: string | null;
    user: string | null;
    action: string;
    student: string | null;
    old: unknown;
    new: unknown;
}

interface Props {
    council: { id: number; class: string | null; term: string };
    entries: Paginated<Entry>;
    filters: { causer_id: number | null; student_id: number | null; action: string };
    users: { id: number; name: string }[];
    students: { id: number; name: string }[];
}

const show = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, item]) => `${key} : ${Array.isArray(item) ? item.join(', ') || '—' : item ?? '—'}`)
            .join(' · ');
    }

    return String(value);
};

/** Journal d'audit d'un conseil (E08). */
export default function Audit({ council, entries, filters, users, students }: Props) {
    const [action, setAction] = useState(filters.action);
    const query = (overrides: Partial<Props['filters']>) =>
        Object.fromEntries(Object.entries({ ...filters, ...overrides }).filter(([, value]) => value !== '' && value !== null));
    const go = (overrides: Partial<Props['filters']>) => router.get(route('admin.councils.audit', council.id), query(overrides), { preserveState: true, replace: true });

    useEffect(() => {
        if (action === filters.action) return;
        const timer = window.setTimeout(() => go({ action }), 300);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action]);

    return (
        <AdminLayout>
            <Head title="Journal du conseil" />
            <p className="text-sm text-ink-500">
                <Link href={route('admin.councils.show', council.id)} className="hover:underline">
                    Conseil {council.class} · {council.term}
                </Link>
            </p>
            <PageHeader title="Journal d’audit" subtitle="Qui a fait quoi, quand, et avec quelles valeurs avant et après.">
                <ExportButtons csvHref={route('admin.councils.audit.csv', { council: council.id, ...query({}) })} />
            </PageHeader>

            <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-3">
                <Select aria-label="Utilisateur" value={filters.causer_id ?? ''} onChange={(e) => go({ causer_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Tous les utilisateurs</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Élève" value={filters.student_id ?? ''} onChange={(e) => go({ student_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Tous les élèves</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                            {student.name}
                        </option>
                    ))}
                </Select>
                <TextInput type="search" aria-label="Action" placeholder="Action (ex. programmé, clôturé)" value={action} onChange={(e) => setAction(e.target.value)} />
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Utilisateur</th>
                                <th className="px-5 py-3">Action</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Avant</th>
                                <th className="px-5 py-3">Après</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {entries.data.map((entry) => (
                                <tr key={entry.id} className="align-top">
                                    <td className="whitespace-nowrap px-5 py-3 text-ink-600">{entry.at ? new Date(entry.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) : '—'}</td>
                                    <td className="px-5 py-3 text-ink-700">{entry.user ?? 'Système'}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{entry.action}</td>
                                    <td className="px-5 py-3 text-ink-700">{entry.student ?? '—'}</td>
                                    <td className="max-w-xs px-5 py-3 text-ink-600">{show(entry.old)}</td>
                                    <td className="max-w-xs px-5 py-3 text-ink-900">{show(entry.new)}</td>
                                </tr>
                            ))}
                            {entries.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-500">
                                        Aucune entrée ne correspond.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={entries} />
            </Card>
        </AdminLayout>
    );
}

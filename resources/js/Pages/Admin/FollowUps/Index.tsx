import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Checkbox, Select } from '@/Components/Admin/Field';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import FollowUpList, { FollowUpRow } from '@/Components/Council/FollowUpList';
import { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';

interface Props {
    mode: 'all' | 'mine';
    followUps: Paginated<FollowUpRow>;
    filters: { council_id: number | null; school_class_id: number | null; owner_id: number | null; status: string; overdue: boolean };
    classes: { id: number; name: string }[];
    owners: { id: number; name: string }[];
    statuses: Record<string, string>;
    canReassign: boolean;
    staff: { id: number; name: string }[];
    councilLabel?: string | null;
}

/** Actions de suivi des conseils (E09) et « Mes actions » (E10). */
export default function Index({ mode, followUps, filters, classes, owners, statuses, canReassign, staff, councilLabel }: Props) {
    const go = (overrides: Partial<Props['filters']>) =>
        router.get(
            route('admin.follow-ups.index'),
            Object.fromEntries(Object.entries({ ...filters, ...overrides }).filter(([, value]) => value !== '' && value !== null && value !== false).map(([key, value]) => [key, value === true ? 1 : value])),
            { preserveState: true, replace: true },
        );

    return (
        <AdminLayout>
            <Head title={mode === 'mine' ? 'Mes actions' : 'Actions de suivi'} />
            <PageHeader
                title={mode === 'mine' ? 'Mes actions de suivi' : 'Actions de suivi'}
                subtitle={mode === 'mine' ? 'Les actions décidées en conseil dont vous êtes responsable, par échéance.' : 'Toutes les actions décidées par les conseils de classe, jusqu’au conseil suivant.'}
            />

            {mode === 'all' && filters.council_id && (
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-700">
                    Conseil : <strong>{councilLabel ?? `n° ${filters.council_id}`}</strong>
                    <button type="button" onClick={() => go({ council_id: null })} className="font-semibold text-ink-900 underline">
                        Tout afficher
                    </button>
                </p>
            )}

            {mode === 'all' && (
                <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
                    <Select aria-label="Classe" value={filters.school_class_id ?? ''} onChange={(e) => go({ school_class_id: e.target.value ? Number(e.target.value) : null, council_id: null })}>
                        <option value="">Toutes les classes</option>
                        {classes.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Select>
                    <Select aria-label="Responsable" value={filters.owner_id ?? ''} onChange={(e) => go({ owner_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Tous les responsables</option>
                        {owners.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Select>
                    <Select aria-label="Statut" value={filters.status} onChange={(e) => go({ status: e.target.value })}>
                        <option value="">Tous les statuts</option>
                        {Object.entries(statuses).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </Select>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={filters.overdue} onChange={(e) => go({ overdue: e.target.checked })} />
                        Échéance dépassée
                    </label>
                </Card>
            )}

            <FollowUpList followUps={followUps.data} statuses={statuses} updateRoute="admin.follow-ups.update" interviewRoute="admin.follow-ups.interview" canReassign={canReassign} staff={staff} showOwner={mode === 'all'} />
            <div className="mt-4">
                <Pagination data={followUps} />
            </div>
        </AdminLayout>
    );
}

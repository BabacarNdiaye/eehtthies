import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { Fragment, useState } from 'react';

interface ActivityRow {
    id: number;
    log_name: string;
    log_label: string;
    description: string;
    subject_type: string | null;
    event: string | null;
    causer_name: string;
    properties: Record<string, unknown>;
    attribute_changes: { attributes?: Record<string, unknown>; old?: Record<string, unknown> } | null;
    created_at: string;
}

interface Props {
    activities: Paginated<ActivityRow>;
    logNames: Record<string, string>;
    staff: { id: number; name: string }[];
    filters: { log_name?: string; causer_id?: string; from?: string; to?: string };
}

const eventLabels: Record<string, string> = {
    created: 'Création',
    updated: 'Modification',
    deleted: 'Suppression',
};

const eventStyles: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700',
    updated: 'bg-amber-100 text-amber-700',
    deleted: 'bg-red-100 text-red-700',
};

function formatDate(value: string): string {
    return new Date(value.replace(' ', 'T')).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ActivityDetails({
    properties,
    attributeChanges,
}: {
    properties: Record<string, unknown>;
    attributeChanges: { attributes?: Record<string, unknown>; old?: Record<string, unknown> } | null;
}) {
    const attributes = attributeChanges?.attributes;
    const old = attributeChanges?.old;
    const before = properties?.before as string[] | undefined;
    const after = properties?.after as string[] | undefined;

    if (before || after) {
        return (
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div>
                    <p className="mb-1 font-semibold text-ink-500">Avant</p>
                    <p className="text-ink-700">{before?.length ? before.join(', ') : '—'}</p>
                </div>
                <div>
                    <p className="mb-1 font-semibold text-ink-500">Après</p>
                    <p className="text-ink-700">{after?.length ? after.join(', ') : '—'}</p>
                </div>
            </div>
        );
    }

    if (!attributes) return <p className="text-xs text-ink-500">Aucun détail disponible.</p>;

    const keys = Object.keys(attributes);

    return (
        <table data-table="scroll" className="w-full text-xs">
            <thead>
                <tr className="text-left text-ink-500">
                    <th className="pb-1 pr-4">Champ</th>
                    {old && <th className="pb-1 pr-4">Avant</th>}
                    <th className="pb-1">Après</th>
                </tr>
            </thead>
            <tbody>
                {keys.map((key) => (
                    <tr key={key} className="border-t border-ink-100">
                        <td className="py-1 pr-4 font-medium text-ink-700">{key}</td>
                        {old && <td className="py-1 pr-4 text-ink-500">{String(old[key] ?? '—')}</td>}
                        <td className="py-1 text-ink-900">{String(attributes[key] ?? '—')}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function Index({ activities, logNames, staff, filters }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.activity-log.index'),
            {
                log_name: filters.log_name ?? '',
                causer_id: filters.causer_id ?? '',
                from: filters.from ?? '',
                to: filters.to ?? '',
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Journal d'activité" />
            <PageHeader
                title="Journal d'activité"
                subtitle="Historique des actions sensibles effectuées sur la plateforme : personnel, élèves, finances, rôles."
            />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Module">
                    <Select value={filters.log_name ?? ''} onChange={(e) => applyFilters({ log_name: e.target.value })}>
                        <option value="">Tous les modules</option>
                        {Object.entries(logNames).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Auteur">
                    <Select value={filters.causer_id ?? ''} onChange={(e) => applyFilters({ causer_id: e.target.value })}>
                        <option value="">Tout le monde</option>
                        {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Du">
                    <TextInput type="date" value={filters.from ?? ''} onChange={(e) => applyFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={filters.to ?? ''} onChange={(e) => applyFilters({ to: e.target.value })} />
                </Field>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Module</th>
                                <th className="px-5 py-3">Action</th>
                                <th className="px-5 py-3">Auteur</th>
                                <th className="px-5 py-3">
                                    <span className="sr-only">Détail</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {activities.data.map((a) => (
                                <Fragment key={a.id}>
                                    <tr className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 text-ink-500">{formatDate(a.created_at)}</td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                                                {a.log_label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-ink-900">
                                            {a.description}
                                            {a.event && (
                                                <span
                                                    className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${eventStyles[a.event] ?? 'bg-ink-100 text-ink-600'}`}
                                                >
                                                    {eventLabels[a.event] ?? a.event}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{a.causer_name}</td>
                                        <td className="px-5 py-3 text-right">
                                            <IconButton
                                                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                                                label={expanded === a.id ? 'Masquer le détail' : 'Voir le détail'}
                                                aria-expanded={expanded === a.id}
                                            >
                                                {expanded === a.id ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </IconButton>
                                        </td>
                                    </tr>
                                    {expanded === a.id && (
                                        <tr>
                                            <td colSpan={5} className="bg-ink-50/60 px-5 py-4">
                                                <ActivityDetails properties={a.properties} attributeChanges={a.attribute_changes} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                            {activities.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune activité enregistrée pour ces filtres.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={activities} />
            </Card>
        </AdminLayout>
    );
}

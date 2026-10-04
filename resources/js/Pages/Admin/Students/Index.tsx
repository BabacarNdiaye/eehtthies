import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import ExportButtons from '@/Components/Admin/ExportButtons';
import Modal from '@/Components/Modal';
import { Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, Student } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { IdCard, Mail, Pencil, Trash2, Upload, UserRound, Users } from 'lucide-react';
import { ChangeEvent, Fragment, useEffect, useRef, useState } from 'react';

interface Props {
    students: Paginated<Student>;
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
    classCounts: Record<string, number>;
    filters: {
        formation_id?: string | number;
        school_class_id?: string | number;
        status?: string;
        search?: string;
    };
}

const statusLabels: Record<string, string> = {
    actif: 'Actif',
    suspendu: 'Suspendu',
    abandon: 'Abandon',
    diplome: 'Diplômé',
    transfere: 'Transféré',
};

export default function Index({ students, formations, schoolClasses, classCounts, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showImport, setShowImport] = useState(false);
    const [cardsClassId, setCardsClassId] = useState<string>('');
    const isFirstRender = useRef(true);

    const importForm = useForm({ file: null as File | null });

    const onImportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        importForm.setData('file', e.target.files?.[0] ?? null);
    };

    const submitImport = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(route('admin.students.import'), {
            forceFormData: true,
            onSuccess: () => {
                setShowImport(false);
                importForm.reset();
            },
        });
    };

    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.get(
            route('admin.students.index'),
            {
                search,
                formation_id: filters.formation_id ?? '',
                school_class_id: filters.school_class_id ?? '',
                status: filters.status ?? '',
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            applyFilters({ search });
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const destroy = async (student: Student) => {
        if (
            await confirmAction(
                `Supprimer l'élève "${student.first_name} ${student.last_name}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.students.destroy', student.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Élèves" />
            <PageHeader
                title="Élèves"
                subtitle="Gérez les dossiers des élèves inscrits."
                action={{
                    label: 'Nouvel élève',
                    href: route('admin.students.create'),
                }}
            >
                <ExportButtons csvHref={route('admin.students.export.csv')} pdfHref={route('admin.students.export.pdf')} />
                <div className="flex max-w-full flex-wrap items-center gap-2">
                    <Select
                        aria-label="Classe des cartes"
                        value={cardsClassId}
                        onChange={(e) => setCardsClassId(e.target.value)}
                        className="!w-auto max-w-full"
                    >
                        <option value="">Choisir une classe…</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                    {cardsClassId ? (
                        <a
                            href={route('admin.students.cards.export', { school_class_id: cardsClassId })}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50 active:scale-[0.98]"
                        >
                            <IdCard className="h-4 w-4" />
                            Cartes de la classe
                        </a>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 opacity-40"
                        >
                            <IdCard className="h-4 w-4" />
                            Cartes de la classe
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50 active:scale-[0.98]"
                >
                    <Upload className="h-4 w-4" />
                    Importer
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        if (await confirmAction("Générer automatiquement une adresse e-mail pour chaque élève ou tuteur qui n'en a pas ?")) {
                            router.post(route('admin.students.generateMissingEmails'), {}, { preserveScroll: true });
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50 active:scale-[0.98]"
                >
                    <Mail className="h-4 w-4" />
                    Générer les e-mails manquants
                </button>
            </PageHeader>

            <Modal show={showImport} onClose={() => setShowImport(false)} maxWidth="md">
                <form onSubmit={submitImport} className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Importer des élèves</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Fichier CSV avec les colonnes matricule, first_name, last_name, birth_date, gender, phone, email,
                        formation, status.{' '}
                        <a href={route('admin.students.import.template')} className="text-brand-600 underline">
                            Télécharger le modèle
                        </a>
                        .
                    </p>
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={onImportFileChange}
                        className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                    />
                    {importForm.errors.file && <p className="mt-2 text-xs text-red-600">{importForm.errors.file}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowImport(false)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={importForm.processing || !importForm.data.file}
                            className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink-800 disabled:opacity-50"
                        >
                            {importForm.processing ? 'Importation…' : 'Importer'}
                        </button>
                    </div>
                </form>
            </Modal>

            <FilterBar
                search={
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un élève, un matricule..."
                    />
                }
                activeCount={[filters.formation_id, filters.school_class_id, filters.status].filter(Boolean).length}
            >
                <Select
                    aria-label="Filtrer par formation"
                    value={filters.formation_id ?? ''}
                    onChange={(e) =>
                        applyFilters({ formation_id: e.target.value })
                    }
                >
                    <option value="">Toutes les formations</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
                <Select
                    aria-label="Filtrer par classe"
                    value={filters.school_class_id ?? ''}
                    onChange={(e) =>
                        applyFilters({ school_class_id: e.target.value })
                    }
                >
                    <option value="">Toutes les classes</option>
                    {schoolClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </Select>
                <Select
                    aria-label="Filtrer par statut"
                    value={filters.status ?? ''}
                    onChange={(e) =>
                        applyFilters({ status: e.target.value })
                    }
                >
                    <option value="">Tous les statuts</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </FilterBar>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {students.data.map((s, index) => {
                                const classKey = String(s.school_class_id ?? 'none');
                                const previous = students.data[index - 1];
                                const startsGroup = !previous || String(previous.school_class_id ?? 'none') !== classKey;

                                return (
                                <Fragment key={s.id}>
                                {startsGroup && (
                                    <tr className="bg-ink-50">
                                        <td colSpan={5} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600">
                                            {s.school_class?.name ?? 'Sans classe'}
                                            <span className="ml-2 font-normal normal-case text-ink-500">
                                                {classCounts[classKey] ?? 0} élève{(classCounts[classKey] ?? 0) > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                    </tr>
                                )}
                                <tr className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            {s.photo ? (
                                                <img
                                                    src={s.photo}
                                                    alt=""
                                                    className="h-9 w-9 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                                                    <UserRound className="h-5 w-5" />
                                                </span>
                                            )}
                                            <div>
                                                <p className="font-medium text-ink-900">
                                                    {s.first_name} {s.last_name}
                                                </p>
                                                <p className="text-xs text-ink-500">
                                                    {s.matricule}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {s.formation?.name ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {s.school_class?.name ?? '—'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge
                                            status={s.status}
                                            label={statusLabels[s.status]}
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink
                                                href={route(
                                                    'admin.students.edit',
                                                    s.id,
                                                )}
                                                label="Modifier"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton
                                                onClick={() => destroy(s)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                                </Fragment>
                                );
                            })}
                            {students.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Users className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun élève enregistré.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={students} />
            </Card>
        </AdminLayout>
    );
}

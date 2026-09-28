import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import ExportButtons from '@/Components/Admin/ExportButtons';
import Modal from '@/Components/Modal';
import { Select, TextInput } from '@/Components/Admin/Field';
import { Paginated, Student } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { IdCard, Mail, Pencil, Search, Trash2, Upload, UserRound, Users } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

interface Props {
    students: Paginated<Student>;
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
    filters: {
        formation_id?: string | number;
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

export default function Index({ students, formations, schoolClasses, filters }: Props) {
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

    const destroy = (student: Student) => {
        if (
            confirm(
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
                <div className="inline-flex items-center gap-2">
                    <Select
                        value={cardsClassId}
                        onChange={(e) => setCardsClassId(e.target.value)}
                        className="!w-auto"
                    >
                        <option value="">Choisir une classe…</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                    <a
                        href={cardsClassId ? route('admin.students.cards.export', { school_class_id: cardsClassId }) : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!cardsClassId}
                        onClick={(e) => {
                            if (!cardsClassId) e.preventDefault();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50 active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                    >
                        <IdCard className="h-4 w-4" />
                        Cartes de la classe
                    </a>
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
                    onClick={() => {
                        if (confirm("Générer automatiquement une adresse e-mail pour chaque élève ou tuteur qui n'en a pas ?")) {
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

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <TextInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un élève, un matricule..."
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.formation_id ?? ''}
                    onChange={(e) =>
                        applyFilters({ formation_id: e.target.value })
                    }
                    className="sm:w-56"
                >
                    <option value="">Toutes les formations</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.status ?? ''}
                    onChange={(e) =>
                        applyFilters({ status: e.target.value })
                    }
                    className="sm:w-48"
                >
                    <option value="">Tous les statuts</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Card>

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
                            {students.data.map((s) => (
                                <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            {s.photo ? (
                                                <img
                                                    src={s.photo}
                                                    alt=""
                                                    className="h-9 w-9 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-400">
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
                                            <Link
                                                href={route(
                                                    'admin.students.edit',
                                                    s.id,
                                                )}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(s)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {students.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
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

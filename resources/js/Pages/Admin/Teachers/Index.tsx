import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import ExportButtons from '@/Components/Admin/ExportButtons';
import Modal from '@/Components/Modal';
import { TextInput } from '@/Components/Admin/Field';
import { Paginated, Teacher } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Mail, Pencil, Search, Trash2, Upload, UserRound } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

interface Props {
    teachers: Paginated<Teacher>;
    filters: { search?: string };
}

const statusLabels: Record<string, string> = {
    actif: 'Actif',
    inactif: 'Inactif',
    suspendu: 'Suspendu',
};

export default function Index({ teachers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showImport, setShowImport] = useState(false);
    const isFirstRender = useRef(true);

    const importForm = useForm({ file: null as File | null });

    const onImportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        importForm.setData('file', e.target.files?.[0] ?? null);
    };

    const submitImport = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(route('admin.teachers.import'), {
            forceFormData: true,
            onSuccess: () => {
                setShowImport(false);
                importForm.reset();
            },
        });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            router.get(
                route('admin.teachers.index'),
                { search },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const destroy = (teacher: Teacher) => {
        if (
            confirm(
                `Supprimer l'enseignant "${teacher.first_name} ${teacher.last_name}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.teachers.destroy', teacher.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Enseignants" />
            <PageHeader
                title="Enseignants"
                subtitle="Gérez le corps enseignant de l'école."
                action={{
                    label: 'Nouvel enseignant',
                    href: route('admin.teachers.create'),
                }}
            >
                <ExportButtons csvHref={route('admin.teachers.export.csv')} pdfHref={route('admin.teachers.export.pdf')} />
                <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50"
                >
                    <Upload className="h-4 w-4" />
                    Importer
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (confirm("Générer automatiquement une adresse e-mail pour chaque enseignant qui n'en a pas ?")) {
                            router.post(route('admin.teachers.generateMissingEmails'), {}, { preserveScroll: true });
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50"
                >
                    <Mail className="h-4 w-4" />
                    Générer les e-mails manquants
                </button>
            </PageHeader>

            <Modal show={showImport} onClose={() => setShowImport(false)} maxWidth="md">
                <form onSubmit={submitImport} className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Importer des enseignants</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Fichier CSV avec les colonnes matricule, first_name, last_name, phone, email, specialty,
                        experience_years, status.{' '}
                        <a href={route('admin.teachers.import.template')} className="text-brand-600 underline">
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
                            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-500 hover:bg-ink-100"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={importForm.processing || !importForm.data.file}
                            className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Importer
                        </button>
                    </div>
                </form>
            </Modal>

            <Card className="mb-6 p-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <TextInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un enseignant, un matricule..."
                        className="pl-9 sm:max-w-sm"
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Enseignant</th>
                                <th className="px-5 py-3">Spécialité</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {teachers.data.map((t) => (
                                <tr key={t.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            {t.photo ? (
                                                <img
                                                    src={t.photo}
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
                                                    {t.first_name} {t.last_name}
                                                </p>
                                                <p className="text-xs text-ink-500">
                                                    {t.matricule}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {t.specialty ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        <p>{t.phone ?? '—'}</p>
                                        <p className="text-xs text-ink-400">
                                            {t.email ?? ''}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge
                                            status={t.status}
                                            label={statusLabels[t.status]}
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={route(
                                                    'admin.teachers.edit',
                                                    t.id,
                                                )}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(t)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {teachers.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-10 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <UserRound className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun enseignant enregistré.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={teachers} />
            </Card>
        </AdminLayout>
    );
}

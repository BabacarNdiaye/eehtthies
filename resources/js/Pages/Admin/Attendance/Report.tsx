import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { SchoolClass } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type SummaryRow = {
    student: StudentRow;
    present: number;
    absent: number;
    retard: number;
    absence_justifiee: number;
};

interface Props {
    schoolClasses: SchoolClass[];
    summary: SummaryRow[];
    selectedClassId: number | null;
    from: string;
    to: string;
}

export default function Report({ schoolClasses, summary, selectedClassId, from, to }: Props) {
    const updateFilters = (patch: Partial<{ school_class_id: string; from: string; to: string }>) => {
        router.get(
            route('admin.attendance.report'),
            { school_class_id: selectedClassId ?? '', from, to, ...patch },
            { preserveState: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Statistiques de présence" />
            <PageHeader
                title="Statistiques de présence"
                subtitle="Suivez l'assiduité des élèves sur une période donnée."
            >
                <Link
                    href={route('admin.attendance.index')}
                    className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    Faire l'appel
                </Link>
            </PageHeader>

            <Card className="mb-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Classe">
                        <Select
                            value={selectedClassId ?? ''}
                            onChange={(e) => updateFilters({ school_class_id: e.target.value })}
                        >
                            <option value="">Sélectionner une classe...</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Du">
                        <TextInput type="date" value={from} onChange={(e) => updateFilters({ from: e.target.value })} />
                    </Field>
                    <Field label="Au">
                        <TextInput type="date" value={to} onChange={(e) => updateFilters({ to: e.target.value })} />
                    </Field>
                </div>
            </Card>

            {!selectedClassId && (
                <Card className="p-10 text-center text-ink-400">
                    Sélectionnez une classe pour afficher les statistiques de présence.
                </Card>
            )}

            {selectedClassId && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3 text-center">Présences</th>
                                    <th className="px-5 py-3 text-center">Absences</th>
                                    <th className="px-5 py-3 text-center">Retards</th>
                                    <th className="px-5 py-3 text-center">Absences justifiées</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {summary.map((row) => (
                                    <tr key={row.student.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {row.student.first_name} {row.student.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{row.student.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3 text-center font-medium text-emerald-600">
                                            {row.present}
                                        </td>
                                        <td className="px-5 py-3 text-center font-medium text-red-600">
                                            {row.absent}
                                        </td>
                                        <td className="px-5 py-3 text-center font-medium text-amber-600">
                                            {row.retard}
                                        </td>
                                        <td className="px-5 py-3 text-center font-medium text-blue-600">
                                            {row.absence_justifiee}
                                        </td>
                                    </tr>
                                ))}
                                {summary.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-400">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <Inbox className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucun élève actif dans cette classe.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </AdminLayout>
    );
}

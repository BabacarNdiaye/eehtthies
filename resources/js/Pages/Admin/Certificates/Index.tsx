import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Internship, Student } from '@/types';
import { Head } from '@inertiajs/react';
import { Award, BadgeCheck, Download, FileCheck } from 'lucide-react';

interface Props {
    diplomas: (Student & { formation?: { id: number; name: string; diploma?: string | null } | null })[];
    attestations: Internship[];
    trainingAttestations: (Student & { formation?: { id: number; name: string; diploma?: string | null } | null })[];
}

export default function Index({ diplomas, attestations, trainingAttestations }: Props) {
    return (
        <AdminLayout>
            <Head title="Diplômes & attestations" />
            <PageHeader
                title="Diplômes & attestations"
                subtitle="Générez et téléchargez les diplômes de fin de formation et les attestations de stage."
            />

            <div className="space-y-8">
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-6 pb-0">
                        <Award className="h-5 w-5 text-gold-600" />
                        <h2 className="font-serif text-lg font-bold text-ink-900">
                            Diplômes de fin de formation
                        </h2>
                    </div>
                    <p className="px-6 pb-4 pt-1 text-sm text-ink-500">
                        Élèves ayant le statut « Diplômé ». Le numéro de diplôme est généré au premier téléchargement.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Formation</th>
                                    <th className="px-5 py-3">N° de diplôme</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {diplomas.map((student) => (
                                    <tr key={student.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {student.first_name} {student.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{student.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{student.formation?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-500">
                                            {student.diploma_number ?? (
                                                <span className="italic text-ink-300">Pas encore généré</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end">
                                                <a
                                                    href={route('admin.students.diploma', student.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    {student.diploma_number ? 'Télécharger' : 'Générer'}
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {diplomas.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-400">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <Award className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucun élève diplômé pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-6 pb-0">
                        <BadgeCheck className="h-5 w-5 text-gold-600" />
                        <h2 className="font-serif text-lg font-bold text-ink-900">Attestations de stage</h2>
                    </div>
                    <p className="px-6 pb-4 pt-1 text-sm text-ink-500">Stages ayant le statut « Terminé ».</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Stage</th>
                                    <th className="px-5 py-3">Structure</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {attestations.map((internship) => (
                                    <tr key={internship.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {internship.student?.first_name} {internship.student?.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{internship.student?.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{internship.title}</td>
                                        <td className="px-5 py-3 text-ink-600">{internship.partner?.name ?? '—'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end">
                                                <a
                                                    href={route('admin.internships.attestation', internship.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    {internship.attestation_number ? 'Télécharger' : 'Générer'}
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {attestations.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-400">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <BadgeCheck className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucun stage terminé pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-6 pb-0">
                        <FileCheck className="h-5 w-5 text-gold-600" />
                        <h2 className="font-serif text-lg font-bold text-ink-900">Attestations de formation</h2>
                    </div>
                    <p className="px-6 pb-4 pt-1 text-sm text-ink-500">
                        Déjà générées, tout élève confondu. Pour un nouvel élève, utilisez le bouton « Télécharger
                        l'attestation » depuis sa fiche.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Formation</th>
                                    <th className="px-5 py-3">N° d'attestation</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {trainingAttestations.map((student) => (
                                    <tr key={student.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {student.first_name} {student.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{student.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{student.formation?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-500">{student.training_attestation_number}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end">
                                                <a
                                                    href={route('admin.students.attestation', student.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> Télécharger
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {trainingAttestations.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-400">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <FileCheck className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucune attestation de formation générée pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}

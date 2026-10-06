import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Head, Link, useForm } from '@inertiajs/react';

interface StudentRow {
    id: number;
    name: string;
    internship: { title: string; company: string | null; status: string } | null;
    company_name: string | null;
    tutor_name: string | null;
    ratings: Record<number, { rating: string | null; comment: string | null }>;
}

interface Props {
    council: { id: number; class: string | null; term: string; status_label: string };
    criteria: { id: number; label: string }[];
    ratings: Record<string, string>;
    students: StudentRow[];
    canWrite: boolean;
}

function StudentGrid({ council, student, criteria, ratings, canWrite }: { student: StudentRow } & Omit<Props, 'students'>) {
    const { data, setData, put, processing, recentlySuccessful } = useForm({
        company_name: student.company_name ?? '',
        tutor_name: student.tutor_name ?? '',
        ratings: Object.fromEntries(criteria.map((criterion) => [criterion.id, { rating: student.ratings[criterion.id]?.rating ?? '', comment: student.ratings[criterion.id]?.comment ?? '' }])),
    });

    return (
        <Card className="p-5">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    put(route('admin.councils.internship.save', [council.id, student.id]), { preserveScroll: true });
                }}
            >
                <h2 className="font-serif text-base font-bold text-ink-900">{student.name}</h2>
                <p className="mb-3 text-sm text-ink-500">{student.internship ? `${student.internship.title}${student.internship.company ? ` — ${student.internship.company}` : ''}` : 'Aucun stage enregistré'}</p>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Entreprise">
                        <TextInput disabled={!canWrite} value={data.company_name} onChange={(e) => setData('company_name', e.target.value)} />
                    </Field>
                    <Field label="Tuteur">
                        <TextInput disabled={!canWrite} value={data.tutor_name} onChange={(e) => setData('tutor_name', e.target.value)} />
                    </Field>
                </div>
                <ul className="divide-y divide-ink-100">
                    {criteria.map((criterion) => (
                        <li key={criterion.id} className="grid gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] sm:items-center">
                            <span className="text-sm text-ink-800">{criterion.label}</span>
                            <Select
                                aria-label={`${criterion.label} — appréciation`}
                                disabled={!canWrite}
                                value={data.ratings[criterion.id].rating}
                                onChange={(e) => setData('ratings', { ...data.ratings, [criterion.id]: { ...data.ratings[criterion.id], rating: e.target.value } })}
                            >
                                <option value="">Non évalué</option>
                                {Object.entries(ratings).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                            <TextInput
                                aria-label={`${criterion.label} — commentaire`}
                                placeholder="Commentaire"
                                disabled={!canWrite}
                                value={data.ratings[criterion.id].comment}
                                onChange={(e) => setData('ratings', { ...data.ratings, [criterion.id]: { ...data.ratings[criterion.id], comment: e.target.value } })}
                            />
                        </li>
                    ))}
                </ul>
                {canWrite && (
                    <div className="mt-3 flex items-center justify-end gap-3">
                        {recentlySuccessful && <span className="text-sm text-emerald-800">Enregistré</span>}
                        <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Enregistrer
                        </button>
                    </div>
                )}
            </form>
        </Card>
    );
}

/** Grille d'évaluation de stage par élève (PRE-06). */
export default function Internship(props: Props) {
    return (
        <AdminLayout>
            <Head title="Évaluation de stage" />
            <p className="text-sm text-ink-500">
                <Link href={route('admin.councils.show', props.council.id)} className="hover:underline">
                    Conseil {props.council.class} · {props.council.term}
                </Link>
            </p>
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Évaluation de stage</h1>
            <p className="mb-6 text-sm text-ink-600">{props.canWrite ? 'Renseignez la grille d’après l’avis du tuteur ; elle s’affiche dans la fiche de l’élève en séance.' : 'Lecture seule.'}</p>
            <div className="space-y-4">
                {props.students.map((student) => (
                    <StudentGrid key={student.id} student={student} council={props.council} criteria={props.criteria} ratings={props.ratings} canWrite={props.canWrite} />
                ))}
            </div>
        </AdminLayout>
    );
}

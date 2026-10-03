import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Select } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { ArrowRightCircle, Inbox, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

type ClassOption = {
    id: number;
    name: string;
    formation: { id: number; name: string } | null;
    academic_year: { id: number; label: string } | null;
};

type SourceClass = ClassOption & {
    next_class: { id: number; name: string } | null;
    formation_level: { id: number; label: string } | null;
};

type EngineAction = 'graduate' | 'promote' | 'stay' | 'fail_final' | 'undetermined';

type StudentRow = {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    decision: string | null;
    suggestion: { action: EngineAction; reasons: string[]; target_class_id: number | null };
};

type Action = 'skip' | 'promote' | 'stay' | 'abandon' | 'graduate' | 'exclude';

interface Props {
    schoolClasses: ClassOption[];
    sourceClass: SourceClass | null;
    students: StudentRow[];
    decisions: Record<string, string>;
    progressionDecisions: Record<string, string>;
    selectedClassId: number | null;
    isFinalLevel: boolean;
}

function defaultAction(row: StudentRow, sourceClass: SourceClass | null): { action: Action; targetClassId: number | '' } {
    const { suggestion } = row;

    if (suggestion.action === 'graduate') {
        return { action: 'graduate', targetClassId: '' };
    }
    if (suggestion.action === 'promote') {
        return { action: 'promote', targetClassId: suggestion.target_class_id ?? sourceClass?.next_class?.id ?? '' };
    }
    if (suggestion.action === 'stay' || suggestion.action === 'fail_final') {
        return { action: 'stay', targetClassId: sourceClass?.id ?? '' };
    }

    // indéterminé (aucune règle configurée) — on se rabat sur l'ancienne heuristique fondée sur la décision.
    if (row.decision === 'admis' && sourceClass?.next_class) {
        return { action: 'promote', targetClassId: sourceClass.next_class.id };
    }
    return { action: 'skip', targetClassId: '' };
}

export default function Index({ schoolClasses, sourceClass, students, decisions, progressionDecisions, selectedClassId, isFinalLevel }: Props) {
    const [rows, setRows] = useState<Record<number, { action: Action; targetClassId: number | '' }>>({});

    useEffect(() => {
        const initial: Record<number, { action: Action; targetClassId: number | '' }> = {};
        students.forEach((s) => {
            initial[s.id] = defaultAction(s, sourceClass);
        });
        setRows(initial);
    }, [students, sourceClass]);

    const changeSourceClass = (value: string) => {
        router.get(route('admin.class-promotion.index'), value ? { school_class_id: value } : {}, { preserveState: true });
    };

    const setRow = (studentId: number, patch: Partial<{ action: Action; targetClassId: number | '' }>) => {
        setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
    };

    const submit = () => {
        const assignments = Object.entries(rows)
            .filter(([, r]) => r.action !== 'skip')
            .map(([studentId, r]) => ({
                student_id: Number(studentId),
                action: r.action,
                target_class_id: r.targetClassId || null,
            }));

        if (assignments.length === 0) {
            alert("Aucune action sélectionnée — choisissez au moins une action pour un élève.");
            return;
        }

        const missingTarget = assignments.some(
            (a) => (a.action === 'promote' || a.action === 'stay') && !a.target_class_id,
        );
        if (missingTarget) {
            alert('Choisissez une classe de destination pour chaque élève promu ou redoublant.');
            return;
        }

        if (!confirm(`Confirmer la passation pour ${assignments.length} élève(s) ? Cette action modifie leur classe/statut immédiatement.`)) {
            return;
        }

        router.post(route('admin.class-promotion.store'), { assignments }, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Passation de classe" />
            <PageHeader
                title="Passation de classe"
                subtitle="Faites passer les élèves d'une classe vers la classe supérieure en fin d'année, selon les règles de passage configurées pour la formation."
            />

            <Card className="mb-6 p-6">
                <div className="max-w-sm">
                    <Select value={selectedClassId ?? ''} onChange={(e) => changeSourceClass(e.target.value)}>
                        <option value="">Sélectionner une classe source</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.academic_year?.label})
                            </option>
                        ))}
                    </Select>
                </div>
                {sourceClass && (
                    <p className="mt-3 text-xs text-ink-500">
                        {!sourceClass.formation_level ? (
                            <span className="italic text-amber-600">
                                Aucune règle de passage configurée pour cette classe — configurez un niveau depuis
                                "Formations → Niveaux & règles" pour activer les suggestions automatiques.
                            </span>
                        ) : isFinalLevel ? (
                            <span className="font-semibold text-gold-700">
                                Niveau final ({sourceClass.formation_level.label}) — les élèves qui valident toutes les règles seront diplômés/certifiés.
                            </span>
                        ) : (
                            <>
                                Niveau : <span className="font-semibold text-ink-700">{sourceClass.formation_level.label}</span>
                                {sourceClass.next_class && (
                                    <>
                                        {' '}— classe suivante configurée manuellement :{' '}
                                        <span className="font-semibold text-ink-700">{sourceClass.next_class.name}</span>
                                    </>
                                )}
                            </>
                        )}
                    </p>
                )}
            </Card>

            {sourceClass && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Suggestion du moteur</th>
                                    <th className="px-5 py-3">Action</th>
                                    <th className="px-5 py-3">Classe de destination</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {students.map((s) => {
                                    const row = rows[s.id] ?? defaultAction(s, sourceClass);
                                    return (
                                        <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-ink-900">
                                                    {s.last_name} {s.first_name}
                                                </p>
                                                <p className="text-xs text-ink-500">{s.matricule}</p>
                                            </td>
                                            <td className="px-5 py-3 text-ink-600">
                                                {s.suggestion.action === 'undetermined' ? (
                                                    <span className="text-ink-400">
                                                        {s.decision ? decisions[s.decision] ?? s.decision : '—'}
                                                    </span>
                                                ) : (
                                                    <details className="group">
                                                        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-ink-700">
                                                            <Info className="h-3.5 w-3.5 text-ink-400" />
                                                            {
                                                                {
                                                                    graduate: 'Diplômer/Certifier',
                                                                    promote: 'Promouvoir',
                                                                    stay: 'Redoubler',
                                                                    fail_final: 'Non admis',
                                                                    undetermined: '—',
                                                                }[s.suggestion.action]
                                                            }
                                                        </summary>
                                                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-ink-500">
                                                            {s.suggestion.reasons.map((r, i) => (
                                                                <li key={i}>{r}</li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Select
                                                    value={row.action}
                                                    onChange={(e) => setRow(s.id, { action: e.target.value as Action })}
                                                    className="max-w-[180px]"
                                                >
                                                    <option value="skip">Ne rien faire</option>
                                                    <option value="promote">Promouvoir</option>
                                                    <option value="stay">Redoubler</option>
                                                    {isFinalLevel && <option value="graduate">Diplômer / Certifier</option>}
                                                    <option value="abandon">Statut → Abandon</option>
                                                    <option value="exclude">Statut → Exclusion</option>
                                                </Select>
                                            </td>
                                            <td className="px-5 py-3">
                                                {(row.action === 'promote' || row.action === 'stay') && (
                                                    <Select
                                                        value={row.targetClassId}
                                                        onChange={(e) =>
                                                            setRow(s.id, { targetClassId: e.target.value ? Number(e.target.value) : '' })
                                                        }
                                                        className="max-w-[220px]"
                                                    >
                                                        <option value="">Choisir une classe…</option>
                                                        {schoolClasses.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} ({c.academic_year?.label})
                                                            </option>
                                                        ))}
                                                    </Select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center">
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
                    {students.length > 0 && (
                        <div className="flex justify-end border-t border-ink-100 p-4">
                            <button
                                onClick={submit}
                                className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                            >
                                <ArrowRightCircle className="h-4 w-4" /> Confirmer la passation
                            </button>
                        </div>
                    )}
                </Card>
            )}
        </AdminLayout>
    );
}

import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

type ClassOption = { id: number; name: string; formation_id: number };
type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type SkillRow = { id: number; name: string; description: string | null };
type AssessmentRow = { id: number; level: number; skill_id: number; student_id: number };

interface Props {
    classes: ClassOption[];
    students: StudentRow[];
    skills: SkillRow[];
    levels: Record<number, Record<number, AssessmentRow>>;
    selectedClassId: number | null;
    levelLabels: Record<number, string>;
}

const levelColors: Record<number, string> = {
    1: 'bg-ink-100 text-ink-500 border-ink-200',
    2: 'bg-amber-100 text-amber-700 border-amber-200',
    3: 'bg-blue-100 text-blue-700 border-blue-200',
    4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function Skills({ classes, students, skills, levels, selectedClassId, levelLabels }: Props) {
    const changeClass = (value: string) => {
        router.get(route('teacher.skills.index'), value ? { school_class_id: value } : {}, { preserveState: true });
    };

    const rate = (studentId: number, skillId: number, level: number) => {
        if (!selectedClassId) return;
        router.post(
            route('teacher.skills.store'),
            {
                school_class_id: selectedClassId,
                student_id: studentId,
                skill_id: skillId,
                level,
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Compétences" />
            <div className="mb-6">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">Compétences</h1>
                <p className="mt-1 text-sm text-ink-500">Évaluez la maîtrise des compétences de la filière pour vos élèves.</p>
            </div>

            <Card className="mb-6 p-6">
                <div className="max-w-xs">
                    <Select value={selectedClassId ?? ''} onChange={(e) => changeClass(e.target.value)}>
                        {classes.length === 0 && <option value="">Aucune classe assignée</option>}
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </Card>

            {selectedClassId && skills.length === 0 && (
                <Card className="p-10 text-center">
                    <div className="flex flex-col items-center gap-3 text-ink-400">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" />
                        </span>
                        <p className="text-sm">Aucune compétence définie pour la filière de cette classe.</p>
                    </div>
                </Card>
            )}

            {selectedClassId && skills.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="sticky left-0 z-10 bg-ink-50 px-5 py-3">Élève</th>
                                    {skills.map((skill) => (
                                        <th key={skill.id} className="px-5 py-3" title={skill.description ?? undefined}>
                                            {skill.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {students.map((student) => (
                                    <tr key={student.id}>
                                        <td className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-ink-900">
                                            {student.last_name} {student.first_name}
                                        </td>
                                        {skills.map((skill) => {
                                            const current = levels[student.id]?.[skill.id]?.level;
                                            return (
                                                <td key={skill.id} className="px-5 py-3">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4].map((level) => (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                title={levelLabels[level]}
                                                                onClick={() => rate(student.id, skill.id, level)}
                                                                className={`h-7 w-7 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                                                                    current === level
                                                                        ? levelColors[level]
                                                                        : 'border-ink-200 text-ink-300 hover:bg-ink-50'
                                                                }`}
                                                            >
                                                                {level}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={skills.length + 1} className="px-5 py-10 text-center text-sm text-ink-400">
                                            Aucun élève actif dans cette classe.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap gap-3 border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
                        {Object.entries(levelLabels).map(([level, label]) => (
                            <span key={level} className="inline-flex items-center gap-1.5">
                                <span className={`h-3 w-3 rounded-full border ${levelColors[Number(level)]}`} />
                                {level} — {label}
                            </span>
                        ))}
                    </div>
                </Card>
            )}
        </PortalLayout>
    );
}

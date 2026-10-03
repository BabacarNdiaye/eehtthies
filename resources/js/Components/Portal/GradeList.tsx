import { subjectStyle } from '@/lib/portal';
import { Exam, Grade } from '@/types';
import { ClipboardList } from 'lucide-react';

export type GradedExam = Exam & { subject?: { id: number; name: string } | null };

function tone(score: number, max: number): string {
    const ratio = max > 0 ? score / max : 0;

    if (ratio >= 0.7) return 'bg-emerald-100 text-emerald-700';
    if (ratio >= 0.5) return 'bg-amber-100 text-amber-700';

    return 'bg-red-100 text-red-700';
}

function formatScore(value: string | number): string {
    return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/**
 * Notes publiées sous forme de cartes (téléphone) : pastille de la matière, intitulé, date et note colorée selon
 * le niveau. Sur ordinateur, les pages gardent leur tableau.
 */
export default function GradeList({ exams, grades, limit }: { exams: GradedExam[]; grades: Record<number, Grade>; limit?: number }) {
    const rows = limit ? exams.slice(0, limit) : exams;

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100">
                <ClipboardList className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">Aucune note publiée pour le moment.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-2.5">
            {rows.map((exam) => {
                const grade = grades[exam.id];
                const { icon: Icon, gradient } = subjectStyle(exam.subject?.name ?? '');
                const max = Number(exam.max_score);

                return (
                    <li key={exam.id} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-ink-100">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
                            <Icon className="h-5 w-5" strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">{exam.title}</p>
                            <p className="truncate text-xs text-ink-500">
                                {exam.subject?.name ?? 'Matière'} · {new Date(exam.exam_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </p>
                        </div>
                        {grade?.is_absent ? (
                            <span className="shrink-0 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-500">Absent(e)</span>
                        ) : grade?.score != null ? (
                            <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${tone(Number(grade.score), max)}`}>
                                {formatScore(grade.score)}
                                <span className="text-[11px] font-semibold opacity-70"> /{formatScore(max)}</span>
                            </span>
                        ) : new Date(exam.exam_date).getTime() > Date.now() ? (
                            <span className="shrink-0 rounded-full bg-gold-100 px-3 py-1.5 text-xs font-semibold text-gold-800">À venir</span>
                        ) : (
                            <span className="shrink-0 text-sm text-ink-300">—</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

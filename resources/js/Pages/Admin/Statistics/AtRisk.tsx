import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import StatisticsTabs from '@/Components/Admin/StatisticsTabs';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

interface RiskStudent {
    id: number;
    name: string;
    matricule: string | null;
    formation: string | null;
    schoolClass: string | null;
    score: number;
    level: 'eleve' | 'moyen' | 'faible';
    reasons: string[];
    unjustifiedAbsences30d: number;
    unjustifiedAbsencesYear: number;
    average: number | null;
    overdueBalance: number;
    overdueInvoicesCount: number;
}

interface Props {
    students: RiskStudent[];
    summary: {
        total: number;
        eleve: number;
        moyen: number;
        faible: number;
        totalActiveStudents: number;
    };
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;


const LEVEL_STYLES: Record<RiskStudent['level'], { label: string; badge: string; row: string }> = {
    eleve: { label: 'Élevé', badge: 'bg-red-100 text-red-700', row: 'border-l-4 border-red-500' },
    moyen: { label: 'Moyen', badge: 'bg-amber-100 text-amber-700', row: 'border-l-4 border-amber-400' },
    faible: { label: 'Faible', badge: 'bg-yellow-100 text-yellow-700', row: 'border-l-4 border-yellow-300' },
};

export default function AtRisk({ students, summary }: Props) {
    return (
        <AdminLayout>
            <Head title="Élèves à risque" />
            <PageHeader title="Statistiques & pilotage" subtitle="Détection automatique des élèves cumulant absences non justifiées, moyenne faible et/ou factures impayées en retard." />
            <StatisticsTabs current="at-risk" />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.total}</p>
                            <p className="text-sm text-ink-500">Élèves signalés / {summary.totalActiveStudents}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-700">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.eleve}</p>
                            <p className="text-sm text-ink-500">Risque élevé</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                            <ShieldQuestion className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.moyen}</p>
                            <p className="text-sm text-ink-500">Risque moyen</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.faible}</p>
                            <p className="text-sm text-ink-500">Risque faible</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Élèves à surveiller</h2>
                    <p className="mt-1 text-xs text-ink-500">
                        Score basé sur : absences non justifiées (30 derniers jours), moyenne générale de l'année, factures en retard de paiement.
                    </p>
                </div>

                {students.length === 0 ? (
                    <p className="p-8 text-center text-sm text-ink-500">Aucun élève ne présente de facteur de risque actuellement. 🎉</p>
                ) : (
                    <div className="divide-y divide-ink-100">
                        {students.map((s) => (
                            <div key={s.id} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${LEVEL_STYLES[s.level].row}`}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link href={route('admin.students.edit', s.id)} className="font-semibold text-ink-900 hover:underline">
                                            {s.name}
                                        </Link>
                                        {s.matricule && <span className="text-xs text-ink-500">#{s.matricule}</span>}
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLES[s.level].badge}`}>
                                            {LEVEL_STYLES[s.level].label}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-ink-500">
                                        {s.formation ?? 'Formation non définie'}
                                        {s.schoolClass ? ` — ${s.schoolClass}` : ''}
                                    </p>
                                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                                        {s.reasons.map((reason, i) => (
                                            <li key={i} className="flex items-center gap-1">
                                                <span className="h-1 w-1 rounded-full bg-ink-400" />
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex shrink-0 gap-4 text-right text-xs text-ink-500 sm:flex-col sm:gap-1">
                                    {s.average !== null && <span>Moyenne : <strong className="text-ink-800">{s.average}/20</strong></span>}
                                    {s.overdueBalance > 0 && (
                                        <span>
                                            Impayé : <strong className="text-ink-800">{fcfa(s.overdueBalance)}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AdminLayout>
    );
}

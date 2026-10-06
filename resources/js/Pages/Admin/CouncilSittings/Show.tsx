import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import { confirmAction } from '@/lib/confirm';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, Play } from 'lucide-react';

interface Props {
    sitting: { id: number; label: string; term: string; year: string | null; is_end_of_year: boolean; scheduled_at: string | null; room: string | null; agenda: string | null; president: string | null; secretary: string | null };
    councils: { id: number; class: string | null; status: string; status_label: string; reviewed: number; total: number; has_main_teacher: boolean }[];
    rollCall: { user_id: number; name: string; functions: string[]; classes: string[]; attendance: string; remote: boolean }[];
    attendances: Record<string, string>;
    can: { schedule: boolean; conduct: boolean };
}

const keep = { preserveScroll: true } as const;

/** Séance commune : les conseils des classes réunies, l'appel fait une fois pour toutes, l'ouverture de toutes les classes. */
export default function Show({ sitting, councils, rollCall, attendances, can }: Props) {
    const drafts = councils.filter((council) => council.status === 'draft').length;
    const scheduled = councils.filter((council) => council.status === 'scheduled').length;
    const inSession = councils.find((council) => council.status === 'in_session');
    const pending = rollCall.filter((person) => person.attendance === 'pending').length;
    const button = 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold';

    const act = async (name: string, question: string) => {
        if (await confirmAction(question)) router.post(route(name, sitting.id), {}, keep);
    };

    return (
        <AdminLayout>
            <Head title="Séance commune" />
            <p className="text-sm text-ink-500">
                <Link href={route('admin.councils.index')} className="hover:underline">
                    Conseils de classe
                </Link>
            </p>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">
                        Séance commune · {sitting.term} · {sitting.year}
                    </h1>
                    <p className="text-sm text-ink-600">
                        {sitting.scheduled_at ? new Date(sitting.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'date à fixer'}
                        {sitting.room && ` · ${sitting.room}`} · présidence : {sitting.president ?? '—'}
                        {sitting.secretary && ` · secrétaire : ${sitting.secretary}`}
                        {sitting.is_end_of_year && ' · fin d’année'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {can.schedule && drafts > 0 && (
                        <button type="button" className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`} onClick={() => void act('admin.council-sittings.schedule', `Programmer les ${drafts} conseil(s) en brouillon ? La photo des données de chaque classe est prise.`)}>
                            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Programmer tout
                        </button>
                    )}
                    {can.conduct && scheduled > 0 && (
                        <button type="button" className={`${button} bg-ink-900 text-white hover:bg-ink-800`} onClick={() => void act('admin.council-sittings.start', `Ouvrir la séance pour les ${scheduled} classe(s) programmée(s) ? Les photos des données seront figées.`)}>
                            <Play className="h-4 w-4" aria-hidden="true" /> Ouvrir la séance
                        </button>
                    )}
                    {inSession && (
                        <Link href={route('council.session.show', inSession.id)} className={`${button} bg-emerald-700 text-white hover:bg-emerald-800`}>
                            <Play className="h-4 w-4" aria-hidden="true" /> Aller à la séance
                        </Link>
                    )}
                </div>
            </div>

            <Card className="mb-6 overflow-hidden">
                <h2 className="border-b border-ink-100 px-5 py-3 font-serif text-base font-bold text-ink-900">Classes ({councils.length})</h2>
                <ul className="divide-y divide-ink-100">
                    {councils.map((council) => (
                        <li key={council.id}>
                            <Link href={route('admin.councils.show', council.id)} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-ink-50">
                                <span className="min-w-0 flex-1 font-semibold text-ink-900">{council.class}</span>
                                {!council.has_main_teacher && <span className="text-xs font-semibold text-amber-800">professeur principal à choisir</span>}
                                <span className="text-ink-600">
                                    {council.reviewed}/{council.total} élèves examinés
                                </span>
                                <CouncilStatusBadge status={council.status} label={council.status_label} />
                            </Link>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 px-5 py-3">
                    <h2 className="font-serif text-base font-bold text-ink-900">Appel ({rollCall.length} personnes)</h2>
                    <p className="text-sm text-ink-600">Fait une seule fois : la présence vaut pour chaque classe où la personne siège.{pending > 0 && ` ${pending} présence(s) à indiquer.`}</p>
                </div>
                <ul className="divide-y divide-ink-100">
                    {rollCall.map((person) => (
                        <li key={person.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                            <div className="min-w-0 flex-1 basis-56">
                                <p className="font-medium text-ink-900">
                                    {person.name}
                                    {person.remote && <span className="ml-2 text-xs font-normal text-sky-800">à distance</span>}
                                </p>
                                <p className="text-xs text-ink-500">
                                    {person.functions.join(', ')} · {person.classes.join(', ')}
                                </p>
                            </div>
                            {can.conduct && scheduled + (inSession ? 1 : 0) > 0 ? (
                                <Select
                                    aria-label={`Présence de ${person.name}`}
                                    className="w-44"
                                    value={person.attendance === 'mixed' ? '' : person.attendance}
                                    onChange={(e) => e.target.value && router.patch(route('admin.council-sittings.attendance', sitting.id), { user_id: person.user_id, attendance: e.target.value }, keep)}
                                >
                                    {person.attendance === 'mixed' && <option value="">Variable selon la classe</option>}
                                    {Object.entries(attendances).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <span className="text-ink-600">{person.attendance === 'mixed' ? 'Variable selon la classe' : attendances[person.attendance]}</span>
                            )}
                        </li>
                    ))}
                </ul>
            </Card>
        </AdminLayout>
    );
}

import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { parentNav } from '@/Pages/Portal/Parent/Dashboard';
import { Select, TextInput } from '@/Components/Admin/Field';
import { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { GraduationCap, MessageCircle, Search, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type PersonRow = {
    id: number;
    user_id?: number | null;
    first_name?: string;
    last_name?: string;
    name?: string;
    photo?: string | null;
    formation?: { id: number; name: string } | null;
    school_class?: { id: number; name: string } | null;
    specialty?: string | null;
};

interface Props {
    students: PersonRow[];
    teachers: PersonRow[];
    staff: PersonRow[];
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
    filters: { role: string | null; formation_id: number | null; school_class_id: number | null };
}

function displayName(p: PersonRow): string {
    return p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
}

function PersonCard({ person, subtitle, userId }: { person: PersonRow; subtitle: string; userId: number | null | undefined }) {
    const name = displayName(person);

    const contact = () => {
        const subject = prompt(`Objet du message à ${name} :`, 'Bonjour');
        if (!subject) return;
        const body = prompt('Votre message :');
        if (!body) return;

        window.axios.post(route('notifications.store'), { recipient_id: userId, subject, body }).then(() => {
            alert('Message envoyé.');
        });
    };

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">
                    {name.charAt(0).toUpperCase()}
                </span>
                <div>
                    <p className="text-sm font-semibold text-ink-900">{name}</p>
                    <p className="text-xs text-ink-500">{subtitle}</p>
                </div>
            </div>
            {userId && (
                <button
                    onClick={contact}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <MessageCircle className="h-3.5 w-3.5" /> Contacter
                </button>
            )}
        </div>
    );
}

export default function Directory({ students, teachers, staff, formations, schoolClasses, filters }: Props) {
    const roles = usePage<PageProps>().props.auth.roles ?? [];
    const [search, setSearch] = useState('');

    const { nav, title } = useMemo(() => {
        if (roles.includes('enseignant')) return { nav: teacherNav, title: 'Espace Enseignant' };
        if (roles.includes('parent')) return { nav: parentNav, title: 'Espace Parent' };
        return { nav: studentNav, title: 'Espace Élève' };
    }, [roles]);

    const filterBy = (key: string, value: string) => {
        router.get(route('directory.index'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    const matches = (name: string) => !search.trim() || name.toLowerCase().includes(search.trim().toLowerCase());

    return (
        <PortalLayout title={title} nav={nav}>
            <Head title="Annuaire" />
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Annuaire</h1>
            <p className="mb-6 text-sm text-ink-500">Retrouvez les membres de la communauté EEHT et démarrez une conversation.</p>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="relative sm:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                    <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un nom..." className="pl-9" />
                </div>
                <Select value={filters.role ?? ''} onChange={(e) => filterBy('role', e.target.value)}>
                    <option value="">Tous les profils</option>
                    <option value="eleve">Élèves</option>
                    <option value="enseignant">Enseignants</option>
                    <option value="administration">Administration</option>
                </Select>
                <Select value={filters.formation_id ?? ''} onChange={(e) => filterBy('formation_id', e.target.value)}>
                    <option value="">Toutes les formations</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
            </div>

            {teachers.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
                        <GraduationCap className="h-4 w-4" /> Enseignants
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {teachers.filter((t) => matches(displayName(t))).map((t) => (
                            <PersonCard key={`t-${t.id}`} person={t} subtitle={t.specialty ?? 'Enseignant'} userId={t.user_id} />
                        ))}
                    </div>
                </section>
            )}

            {students.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
                        <Users className="h-4 w-4" /> Élèves
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {students.filter((s) => matches(displayName(s))).map((s) => (
                            <PersonCard
                                key={`s-${s.id}`}
                                person={s}
                                subtitle={`${s.formation?.name ?? ''}${s.school_class ? ` · ${s.school_class.name}` : ''}`}
                                userId={s.user_id}
                            />
                        ))}
                    </div>
                </section>
            )}

            {staff.length > 0 && (
                <section>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
                        <ShieldCheck className="h-4 w-4" /> Administration
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {staff.filter((s) => matches(displayName(s))).map((s) => (
                            <PersonCard key={`a-${s.id}`} person={s} subtitle="Administration" userId={s.id} />
                        ))}
                    </div>
                </section>
            )}
        </PortalLayout>
    );
}

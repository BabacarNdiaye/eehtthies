import Card from '@/Components/Admin/Card';
import Pagination from '@/Components/Admin/Pagination';
import StudentCard from '@/Components/Admin/Students/StudentCard';
import { StudentPermissions } from '@/Components/Admin/Students/StudentParts';
import StudentTable from '@/Components/Admin/Students/StudentTable';
import { noScope, Patch, sectionsOf, statusPlurals, StudentRow, StudentsPageProps, StudentStatus, studentCount } from '@/lib/students';
import { Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, ChevronRight, IdCard, Layers, Plus, SearchX, Users } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
    page: StudentsPageProps;
    view: 'cards' | 'list';
    /** À partir de lg : le mode « Liste » (tableau) est permis ; en dessous, toujours des cartes (le tableau n'y tiendrait pas sans défiler). */
    wide: boolean;
    can: StudentPermissions & { add: boolean };
    hrefFor: (patch: Patch) => string;
    /** Adresse du formulaire de nouvel élève, déjà préremplie avec la formation et la classe de la portée. */
    newStudentHref: string;
    flashId: number | null;
    /** La recherche et les filtres : ils s'affichent entre l'en-tête de la promotion et ses élèves. */
    toolbar: ReactNode;
    /** Ouvre le choix d'une autre promotion (sous xl, où le plan des promotions n'a pas sa colonne). */
    onChangeScope: () => void;
    onOpen: (student: StudentRow) => void;
    onDelete: (student: StudentRow) => void;
    onShowEverything: () => void;
    onClearSearch: () => void;
    /** Retire le filtre « À compléter » (affiché quand tous les dossiers de la vue sont complets). */
    onClearIncomplete: () => void;
}

/** Où l'on se trouve : Vue d'ensemble › BTS › BTS Tourisme › 1re année › BTS 1 Tourisme. Chaque étape ramène à sa portée. */
function Breadcrumb({ page, hrefFor }: { page: StudentsPageProps; hrefFor: Props['hrefFor'] }) {
    const scope = page.scope;

    if (!scope) return null;

    const crumbs: { label: string; href?: string }[] = [{ label: "Vue d'ensemble", href: hrefFor(noScope) }];

    if (scope.diploma && scope.kind !== 'unassigned') crumbs.push({ label: scope.diploma.label });

    if (scope.formation && scope.kind !== 'no_formation') {
        crumbs.push({ label: scope.formation.name, href: hrefFor({ ...noScope, formation_id: String(scope.formation.id) }) });
    }

    if (scope.level && scope.kind === 'class' && scope.formation) {
        crumbs.push({ label: scope.level.label, href: hrefFor({ ...noScope, formation_id: String(scope.formation.id), formation_level_id: String(scope.level.id) }) });
    }

    // La dernière étape est la portée elle-même : pour une formation ou un niveau, elle remplace le lien qui y mène.
    if (scope.kind === 'formation') crumbs.pop();
    crumbs.push({ label: scope.title });

    // Sur téléphone, le fil entier prendrait trois lignes : un seul lien, celui du niveau au-dessus, ramène d'un cran.
    const parent = [...crumbs.slice(0, -1)].reverse().find((crumb) => crumb.href);

    return (
        <nav aria-label="Fil d'Ariane de la promotion">
            {parent && (
                <Link href={parent.href as string} preserveState className="inline-flex min-h-8 items-center gap-1 rounded text-sm font-medium text-ink-600 outline-none hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-gold-500 md:hidden">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {parent.label}
                </Link>
            )}
            <ol className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-500 md:flex">
                {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;

                    return (
                        <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />}
                            {last ? (
                                <span aria-current="page" className="font-medium text-ink-900">
                                    {crumb.label}
                                </span>
                            ) : crumb.href ? (
                                <Link href={crumb.href} preserveState className="rounded outline-none hover:text-ink-900 hover:underline focus-visible:ring-2 focus-visible:ring-gold-500">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span>{crumb.label}</span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

const secondaryButton =
    'inline-flex min-h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500';
const primaryButton =
    'inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500';

/** La liste des élèves d'une portée, rangés par classe : cartes (par défaut, sur téléphone aussi) ou tableau (ordinateur). */
export default function DirectoryView({
    page,
    view,
    wide,
    can,
    hrefFor,
    newStudentHref,
    flashId,
    toolbar,
    onChangeScope,
    onOpen,
    onDelete,
    onShowEverything,
    onClearSearch,
    onClearIncomplete,
}: Props) {
    const { scope, students, filters, classCounts, elsewhere } = page;

    if (!scope || !students) return null;

    const classScope = scope.kind === 'class' && scope.class !== null;
    const allComplete = filters.incomplete && students.total === 0 && scope.kind !== 'search';
    // Un en-tête par classe quand la liste en mêle plusieurs et qu'elle est rangée par classe ; sinon, la classe s'écrit sur
    // chaque élève (sauf dans une classe : c'est le titre de la page).
    const grouped = filters.sort === 'name' && scope.kind !== 'class';
    const showClass = !grouped && scope.kind !== 'class';
    // Le statut ne s'écrit que sur une liste qui en mêle plusieurs : sous « Actifs » ou « Diplômés », la pastille du filtre le dit.
    const showStatus = filters.status === 'all';
    const sections = sectionsOf(students.data);
    const asTable = wide && view === 'list';
    const capacity = scope.class?.capacity ?? null;
    const taken = scope.class?.active ?? 0;
    const ratio = capacity ? Math.min(100, Math.round((taken / capacity) * 100)) : null;
    const details = scope.class ? [scope.class.level, scope.class.year].filter(Boolean).join(' · ') : '';

    return (
        <div className="space-y-4">
            <Card className="p-4 sm:p-5">
                <Breadcrumb page={page} hrefFor={hrefFor} />
                <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <div className="flex min-w-0 flex-1 basis-72 items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="break-words font-serif text-2xl font-bold leading-tight text-ink-900">{scope.title}</h2>
                            <p className="mt-1 text-sm text-ink-500">
                                {studentCount(students.total)}
                                {filters.status !== 'all' && statusPlurals[filters.status as StudentStatus] && ` · ${statusPlurals[filters.status as StudentStatus].toLowerCase()}`}
                                {filters.incomplete && ' · dossiers à compléter'}
                                {details && ` · ${details}`}
                            </p>
                        </div>
                        {/* Sous xl, le plan des promotions est dans un volet : ce bouton l'ouvre. */}
                        <button type="button" onClick={onChangeScope} aria-haspopup="dialog" className={`${secondaryButton} shrink-0 xl:hidden`}>
                            <Layers className="h-4 w-4" aria-hidden="true" />
                            Changer
                        </button>
                    </div>
                    {/* Sur téléphone, « Nouvel élève » (déjà prérempli) et le menu Actions (cartes de la classe) suffisent. */}
                    <div className="hidden flex-wrap items-center gap-2 md:flex">
                        {classScope && can.card && (
                            <a href={route('admin.students.cards.export', { school_class_id: scope.class?.id })} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                                <IdCard className="h-4 w-4" aria-hidden="true" />
                                Cartes de la classe
                            </a>
                        )}
                        {can.add && (scope.kind === 'class' || scope.kind === 'formation' || scope.kind === 'level') && (
                            <Link href={newStudentHref} className={secondaryButton}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {scope.kind === 'class' ? 'Ajouter à cette classe' : 'Ajouter à cette formation'}
                            </Link>
                        )}
                    </div>
                </div>

                {classScope && ratio !== null && capacity && (
                    <div className="mt-4 max-w-sm">
                        <div className="mb-1 flex justify-between text-xs text-ink-500">
                            <span>Places occupées</span>
                            <span className="font-semibold tabular-nums text-ink-700">
                                {taken} / {capacity}
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Places occupées"
                            aria-valuemin={0}
                            aria-valuemax={capacity}
                            aria-valuenow={Math.min(taken, capacity)}
                            className="h-1.5 overflow-hidden rounded-full bg-ink-100"
                        >
                            <div className={`h-full rounded-full ${taken >= capacity ? 'bg-red-500' : ratio >= 90 ? 'bg-amber-500' : 'bg-gold-500'}`} style={{ width: `${ratio}%` }} />
                        </div>
                    </div>
                )}
            </Card>

            {toolbar}

            {students.total === 0 ? (
                <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                    {/* « À compléter » sans résultat est une bonne nouvelle : tous les dossiers de la vue sont complets. */}
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${allComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-50 text-ink-500'}`}>
                        {allComplete ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : scope.kind === 'search' ? <SearchX className="h-6 w-6" aria-hidden="true" /> : <Users className="h-6 w-6" aria-hidden="true" />}
                    </span>
                    <p className="font-medium text-ink-900">
                        {allComplete ? 'Tous les dossiers de cette vue sont complets.' : scope.kind === 'search' ? `Aucun élève ne correspond à « ${filters.search} ».` : 'Aucun élève ici.'}
                    </p>
                    {elsewhere && (
                        <p className="max-w-md text-sm text-ink-500">
                            {studentCount(elsewhere.count)} {elsewhere.count > 1 ? 'correspondent' : 'correspond'} pour une autre année ou un autre statut.
                        </p>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                        {allComplete && (
                            <button type="button" onClick={onClearIncomplete} className={elsewhere ? secondaryButton : primaryButton}>
                                Voir tous les élèves
                            </button>
                        )}
                        {elsewhere && (
                            <button type="button" onClick={onShowEverything} className={primaryButton}>
                                Tout afficher
                            </button>
                        )}
                        {scope.kind === 'search' && (
                            <button type="button" onClick={onClearSearch} className={secondaryButton}>
                                Effacer la recherche
                            </button>
                        )}
                        {can.add && scope.kind !== 'search' && !elsewhere && !allComplete && (
                            <Link href={newStudentHref} className={primaryButton}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Nouvel élève
                            </Link>
                        )}
                    </div>
                </Card>
            ) : asTable ? (
                <StudentTable sections={sections} classCounts={classCounts} grouped={grouped} showClass={showClass} showStatus={showStatus} flashId={flashId} can={can} onOpen={onOpen} onDelete={onDelete} />
            ) : (
                <div className="space-y-6">
                    {sections.map((section) => (
                        <div key={section.key}>
                            {grouped && (
                                <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink-800">
                                    {section.class?.name ?? 'À affecter'}
                                    <span className="text-xs font-normal text-ink-500">
                                        {studentCount(classCounts[section.key] ?? section.students.length)}
                                        {[section.level, section.year].filter(Boolean).length > 0 && ` · ${[section.level, section.year].filter(Boolean).join(' · ')}`}
                                    </span>
                                </h3>
                            )}
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                                {section.students.map((student) => (
                                    <StudentCard key={student.id} student={student} showClass={showClass} showStatus={showStatus} flash={student.id === flashId} can={can} onOpen={onOpen} onDelete={onDelete} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {students.last_page > 1 && (
                <Card>
                    <Pagination data={students} />
                </Card>
            )}
        </div>
    );
}

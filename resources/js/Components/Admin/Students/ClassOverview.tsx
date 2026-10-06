import Card from '@/Components/Admin/Card';
import { ClassNode, Filters, FormationNode, LevelNode, noScope, Patch, studentCount, Tree } from '@/lib/students';
import { Link } from '@inertiajs/react';
import { AlertCircle, ChevronRight, ClipboardList, GraduationCap, Layers, LucideIcon, Plus, Upload, Users } from 'lucide-react';

interface Props {
    tree: Tree;
    stats: { students: number; classes: number; unassigned: number; incomplete: number };
    filters: Filters;
    hrefFor: (patch: Patch) => string;
    /** Élèves qui existent pour d'autres années ou statuts, quand celui-ci n'en montre aucun. */
    elsewhere: { count: number } | null;
    onShowEverything: () => void;
    can: { add: boolean; import: boolean };
    newStudentHref: string;
    onImport: () => void;
}

const statusLabel: Record<string, string> = {
    all: 'Élèves, tous statuts',
    actif: 'Élèves actifs',
    suspendu: 'Élèves suspendus',
    diplome: 'Diplômés',
    transfere: 'Transférés',
    abandon: 'Abandons',
    exclu: 'Exclus',
};

function Stat({ icon: Icon, value, label, href, tone }: { icon: LucideIcon; value: number; label: string; href?: string; tone: string }) {
    const body = (
        <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tone}`}>
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-xl font-bold leading-tight tabular-nums text-ink-900 sm:text-2xl">{value}</span>
                <span className="block text-xs leading-tight text-ink-500">{label}</span>
            </span>
        </>
    );
    const box = 'flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-soft sm:p-4';

    return href ? (
        <Link href={href} preserveState className={`${box} outline-none transition-shadow hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-gold-500`}>
            {body}
        </Link>
    ) : (
        <div className={box}>{body}</div>
    );
}

/** Une classe en tuile : effectif, jauge des places quand la capacité est connue, dossiers à compléter. Toute la tuile ouvre la classe. */
function ClassTile({ node, href }: { node: ClassNode; href: string }) {
    const ratio = node.capacity ? Math.min(100, Math.round((node.count / node.capacity) * 100)) : null;
    const full = node.capacity !== null && node.count >= node.capacity;
    const bar = full ? 'bg-red-500' : ratio !== null && ratio >= 90 ? 'bg-amber-500' : 'bg-gold-500';

    return (
        <Link
            href={href}
            preserveState
            className="group flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-soft outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-gold-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
            <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                    <span className="block break-words font-semibold leading-snug text-ink-900">{node.name}</span>
                    <span className="block text-xs text-ink-500">{[node.level, node.year].filter(Boolean).join(' · ') || 'Classe'}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500 motion-reduce:transition-none" aria-hidden="true" />
            </span>

            <span className="block">
                <span className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tabular-nums text-ink-900">{node.count}</span>
                    <span className="text-sm text-ink-500">{node.capacity ? `/ ${node.capacity} places` : node.count > 1 ? 'élèves' : 'élève'}</span>
                    {full && <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Complet</span>}
                </span>
                {ratio !== null && (
                    <span
                        role="progressbar"
                        aria-label={`Places occupées en ${node.name}`}
                        aria-valuemin={0}
                        aria-valuemax={node.capacity ?? 0}
                        aria-valuenow={Math.min(node.count, node.capacity ?? 0)}
                        className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-100"
                    >
                        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${ratio}%` }} />
                    </span>
                )}
            </span>

            {node.incomplete > 0 && <span className="text-xs font-medium text-amber-700">{node.incomplete} dossier{node.incomplete > 1 ? 's' : ''} à compléter</span>}
        </Link>
    );
}

/** Des tuiles de classe qui s'étalent selon la place disponible : une colonne sur téléphone, autant que possible au-delà. */
function Tiles({ classes, hrefFor }: { classes: ClassNode[]; hrefFor: (node: ClassNode) => string }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-3">
            {classes.map((node) => (
                <ClassTile key={node.id} node={node} href={hrefFor(node)} />
            ))}
        </div>
    );
}

function FormationBlock({ formation, hrefFor }: { formation: FormationNode; hrefFor: Props['hrefFor'] }) {
    const classHref = (node: ClassNode) => hrefFor({ ...noScope, school_class_id: String(node.id) });
    const hasLevels = formation.levels.length > 0;

    return (
        <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h3 className="min-w-0 flex-1 basis-48 font-serif text-lg font-bold leading-snug text-ink-900">
                    <Link href={hrefFor({ ...noScope, formation_id: String(formation.id) })} preserveState className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-gold-500">
                        {formation.name}
                    </Link>
                    {!formation.is_active && <span className="ml-2 align-middle text-xs font-normal text-ink-500">formation inactive</span>}
                </h3>
                <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">{studentCount(formation.count)}</span>
                {formation.unassigned > 0 && (
                    <Link
                        href={hrefFor({ ...noScope, formation_id: String(formation.id), school_class_id: 'none' })}
                        preserveState
                        className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 outline-none hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                        {formation.unassigned} à affecter
                    </Link>
                )}
            </div>

            {hasLevels ? (
                // Les niveaux d'année en colonnes, de gauche à droite : on lit la progression de la formation d'un coup d'œil.
                <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-x-4 gap-y-6">
                    {formation.levels.map((level: LevelNode) => (
                        <div key={level.id} className="min-w-0">
                            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                                <Link
                                    href={hrefFor({ ...noScope, formation_id: String(formation.id), formation_level_id: String(level.id) })}
                                    preserveState
                                    className="rounded outline-none hover:text-ink-800 hover:underline focus-visible:ring-2 focus-visible:ring-gold-500"
                                >
                                    {level.label}
                                </Link>
                                <span className="font-normal normal-case text-ink-500">{studentCount(level.count)}</span>
                            </h4>
                            <div className="space-y-3">
                                {level.classes.map((node) => (
                                    <ClassTile key={node.id} node={node} href={classHref(node)} />
                                ))}
                            </div>
                        </div>
                    ))}
                    {formation.classes.length > 0 && (
                        <div className="min-w-0">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Autres classes</h4>
                            <div className="space-y-3">
                                {formation.classes.map((node) => (
                                    <ClassTile key={node.id} node={node} href={classHref(node)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : formation.classes.length > 0 ? (
                <Tiles classes={formation.classes} hrefFor={classHref} />
            ) : (
                <p className="text-sm text-ink-500">Aucune classe pour cette année : les élèves de cette formation attendent d'être affectés.</p>
            )}
        </Card>
    );
}

/**
 * L'écran d'accueil de la page Élèves : plutôt qu'une liste de tout le monde, les promotions de l'année rangées par niveau
 * de formation puis par formation, chaque classe en tuile avec son effectif. On choisit une classe pour voir ses élèves.
 */
export default function ClassOverview({ tree, stats, filters, hrefFor, elsewhere, onShowEverything, can, newStudentHref, onImport }: Props) {
    const empty = tree.total === 0 && tree.groups.length === 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={Users} value={stats.students} label={statusLabel[filters.status] ?? 'Élèves'} tone="bg-emerald-100 text-emerald-700" />
                <Stat icon={Layers} value={stats.classes} label={stats.classes > 1 ? 'Classes' : 'Classe'} tone="bg-blue-100 text-blue-700" />
                <Stat
                    icon={AlertCircle}
                    value={stats.unassigned}
                    label="À affecter"
                    href={stats.unassigned > 0 ? hrefFor({ ...noScope, school_class_id: 'none' }) : undefined}
                    tone={stats.unassigned > 0 ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500'}
                />
                <Stat
                    icon={ClipboardList}
                    value={stats.incomplete}
                    label="Dossiers à compléter"
                    href={stats.incomplete > 0 ? hrefFor({ ...noScope, incomplete: true }) : undefined}
                    tone={stats.incomplete > 0 ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500'}
                />
            </div>

            {empty && (
                <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-500">
                        <GraduationCap className="h-6 w-6" aria-hidden="true" />
                    </span>
                    {elsewhere ? (
                        <>
                            <p className="font-medium text-ink-900">Aucun élève dans cette vue.</p>
                            <p className="max-w-md text-sm text-ink-500">
                                {studentCount(elsewhere.count)} {elsewhere.count > 1 ? 'existent' : 'existe'} pour une autre année ou un autre statut.
                            </p>
                            <button type="button" onClick={onShowEverything} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500">
                                Tout afficher
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="font-medium text-ink-900">Aucun élève enregistré.</p>
                            <p className="max-w-md text-sm text-ink-500">Ajoutez un premier élève ou importez une liste : les promotions s'organisent ici dès qu'ils sont affectés à une classe.</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {can.add && (
                                    <Link href={newStudentHref} className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500">
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                        Nouvel élève
                                    </Link>
                                )}
                                {can.import && (
                                    <button type="button" onClick={onImport} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500">
                                        <Upload className="h-4 w-4" aria-hidden="true" />
                                        Importer
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </Card>
            )}

            {tree.groups.map((group) => (
                <section key={group.key} aria-labelledby={`diploma-${group.key}`}>
                    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 id={`diploma-${group.key}`} className="font-serif text-xl font-bold text-ink-900">
                            {group.label}
                        </h2>
                        {group.title && <p className="text-sm text-ink-500">{group.title}</p>}
                        <span className="ml-auto rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">{studentCount(group.count)}</span>
                    </div>
                    <div className="space-y-4">
                        {group.formations.map((formation) => (
                            <FormationBlock key={formation.id} formation={formation} hrefFor={hrefFor} />
                        ))}
                    </div>
                </section>
            ))}

            {tree.no_formation > 0 && (
                <Card className="flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50 p-4">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                    <p className="min-w-0 flex-1 basis-56 text-sm text-amber-900">
                        <span className="font-semibold">{studentCount(tree.no_formation)}</span> sans formation : leur dossier n'apparaît dans aucune promotion.
                    </p>
                    <Link href={hrefFor({ ...noScope, formation_id: 'none' })} preserveState className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-gold-500">
                        Voir ces élèves
                    </Link>
                </Card>
            )}
        </div>
    );
}

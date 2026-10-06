import { Select } from '@/Components/Admin/Field';
import { ClassNode, Filters, FormationNode, noScope, Patch, Tree, YearOption } from '@/lib/students';
import { Link } from '@inertiajs/react';
import { AlertCircle, ChevronRight, LayoutGrid, Users } from 'lucide-react';
import { ReactNode, useEffect, useId, useState } from 'react';

interface Props {
    mode: 'overview' | 'directory';
    tree: Tree;
    filters: Filters;
    years: YearOption[];
    allYearsCount: number;
    /** Adresse de la vue obtenue en changeant ces filtres. */
    hrefFor: (patch: Patch) => string;
    onYearChange: (year: string) => void;
    /** Appelé quand on choisit une promotion : le volet du téléphone se referme. */
    onNavigate?: () => void;
}

/** Les formations que contient l'arbre autour de la portée choisie : elles s'ouvrent d'elles-mêmes. */
function pathKeys(tree: Tree, filters: Filters): string[] {
    const keys: string[] = [];
    const inClass = (node: ClassNode) => filters.school_class_id === String(node.id);

    for (const group of tree.groups) {
        for (const formation of group.formations) {
            const here =
                filters.formation_id === String(formation.id) ||
                formation.classes.some(inClass) ||
                formation.levels.some((level) => filters.formation_level_id === String(level.id) || level.classes.some(inClass));

            if (here) keys.push(`f:${formation.id}`);
        }
    }

    return keys;
}

const rowBase = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm leading-snug outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 max-md:min-h-11';

function Item({ href, active, count, onNavigate, className = '', children }: { href: string; active: boolean; count?: number; onNavigate?: () => void; className?: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            preserveState
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`${rowBase} ${active ? 'bg-gold-100 font-semibold text-ink-900' : 'text-ink-700 hover:bg-ink-50'} ${className}`}
        >
            <span className="min-w-0 flex-1 break-words">{children}</span>
            {count !== undefined && <span className={`shrink-0 text-xs tabular-nums ${active ? 'text-ink-700' : 'text-ink-500'}`}>{count}</span>}
        </Link>
    );
}

function Toggle({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-expanded={open}
            aria-label={`${open ? 'Replier' : 'Déplier'} ${label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 outline-none hover:bg-ink-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-gold-500 max-md:h-11 max-md:w-11"
        >
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
        </button>
    );
}

/**
 * Le plan des promotions : niveau de formation (le diplôme : CAP, BEP, BTS…) > formation > niveau d'année > classe, avec
 * les effectifs au statut et à l'année choisis. Choisir un nœud ouvre la liste de ses élèves ; « Vue d'ensemble » ramène
 * aux tuiles. Les formations sans classe ni élève n'y figurent pas.
 */
export default function ScopeNavigator({ mode, tree, filters, years, allYearsCount, hrefFor, onYearChange, onNavigate }: Props) {
    const yearId = useId();
    // Les groupes (diplômes) sont ouverts sauf si on les replie ; les formations sont repliées sauf si la portée y est.
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(pathKeys(tree, filters)));

    useEffect(() => {
        setExpanded((previous) => new Set([...previous, ...pathKeys(tree, filters)]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree, filters.formation_id, filters.formation_level_id, filters.school_class_id]);

    const flip = (setter: typeof setCollapsed, key: string) =>
        setter((previous) => {
            const next = new Set(previous);

            if (next.has(key)) next.delete(key);
            else next.add(key);

            return next;
        });

    const noScopeSelected = filters.formation_id === '' && filters.formation_level_id === '' && filters.school_class_id === '';
    const showYear = filters.year === 'all';
    const go = (patch: Patch) => hrefFor({ ...noScope, ...patch });

    const classRow = (node: ClassNode) => (
        <li key={node.id}>
            <Item href={go({ school_class_id: String(node.id) })} active={filters.school_class_id === String(node.id)} count={node.count} onNavigate={onNavigate}>
                {node.name}
                {showYear && node.year && <span className="ml-1.5 text-xs font-normal text-ink-500">{node.year}</span>}
            </Item>
        </li>
    );

    const formationRow = (formation: FormationNode) => {
        const key = `f:${formation.id}`;
        const open = expanded.has(key);
        const hasChildren = formation.levels.length > 0 || formation.classes.length > 0 || formation.unassigned > 0;

        return (
            <li key={formation.id}>
                <div className="flex items-center gap-0.5">
                    {hasChildren ? <Toggle open={open} label={formation.name} onClick={() => flip(setExpanded, key)} /> : <span className="w-8 shrink-0 max-md:w-11" aria-hidden="true" />}
                    <Item
                        href={go({ formation_id: String(formation.id) })}
                        active={filters.formation_id === String(formation.id) && filters.formation_level_id === '' && filters.school_class_id === ''}
                        count={formation.count}
                        onNavigate={onNavigate}
                        className="flex-1"
                    >
                        {formation.name}
                        {!formation.is_active && <span className="ml-1.5 text-xs font-normal text-ink-500">inactive</span>}
                    </Item>
                </div>
                {open && hasChildren && (
                    <ul className="ml-4 space-y-0.5 border-l border-ink-100 pl-2 max-md:ml-5">
                        {formation.levels.map((level) => (
                            <li key={`level-${level.id}`}>
                                <Item
                                    href={go({ formation_id: String(formation.id), formation_level_id: String(level.id) })}
                                    active={filters.formation_level_id === String(level.id) && filters.school_class_id === ''}
                                    count={level.count}
                                    onNavigate={onNavigate}
                                    className="font-medium"
                                >
                                    {level.label}
                                </Item>
                                <ul className="ml-3 space-y-0.5 border-l border-ink-100 pl-2">{level.classes.map(classRow)}</ul>
                            </li>
                        ))}
                        {formation.classes.map(classRow)}
                        {formation.unassigned > 0 && (
                            <li>
                                <Item
                                    href={go({ formation_id: String(formation.id), school_class_id: 'none' })}
                                    active={filters.formation_id === String(formation.id) && filters.school_class_id === 'none'}
                                    count={formation.unassigned}
                                    onNavigate={onNavigate}
                                    className="italic"
                                >
                                    À affecter
                                </Item>
                            </li>
                        )}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <nav aria-label="Promotions" className="space-y-4">
            <div>
                <label htmlFor={yearId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Année académique
                </label>
                <Select id={yearId} name="year" value={filters.year} onChange={(event) => onYearChange(event.target.value)}>
                    {years.map((year) => (
                        <option key={year.id} value={String(year.id)}>
                            {year.is_current ? `${year.label} · en cours` : `${year.label} (${year.count})`}
                        </option>
                    ))}
                    <option value="all">Toutes les années ({allYearsCount})</option>
                </Select>
            </div>

            <ul className="space-y-0.5">
                <li>
                    <Item href={hrefFor(noScope)} active={mode === 'overview'} onNavigate={onNavigate}>
                        <span className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Vue d'ensemble
                        </span>
                    </Item>
                </li>
                <li>
                    <Item href={hrefFor({ ...noScope, list: true })} active={mode === 'directory' && filters.list && noScopeSelected && filters.search === ''} count={tree.total} onNavigate={onNavigate}>
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Tous les élèves
                        </span>
                    </Item>
                </li>
            </ul>

            {tree.groups.map((group) => {
                const key = `g:${group.key}`;
                const open = !collapsed.has(key);

                return (
                    <div key={group.key}>
                        <button
                            type="button"
                            onClick={() => flip(setCollapsed, key)}
                            aria-expanded={open}
                            title={group.title ?? undefined}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 max-md:min-h-11"
                        >
                            <ChevronRight className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
                            <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-ink-700">{group.label}</span>
                            <span className="text-xs tabular-nums text-ink-500">{group.count}</span>
                        </button>
                        {open && <ul className="mt-0.5 space-y-0.5">{group.formations.map(formationRow)}</ul>}
                    </div>
                );
            })}

            {(tree.unassigned > 0 || tree.no_formation > 0) && (
                <ul className="space-y-0.5 border-t border-ink-100 pt-3">
                    {tree.unassigned > 0 && (
                        <li>
                            <Item href={go({ school_class_id: 'none' })} active={filters.school_class_id === 'none' && filters.formation_id === ''} count={tree.unassigned} onNavigate={onNavigate}>
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />À affecter à une classe
                                </span>
                            </Item>
                        </li>
                    )}
                    {tree.no_formation > 0 && (
                        <li>
                            <Item href={go({ formation_id: 'none' })} active={filters.formation_id === 'none' && filters.school_class_id === ''} count={tree.no_formation} onNavigate={onNavigate}>
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    Sans formation
                                </span>
                            </Item>
                        </li>
                    )}
                </ul>
            )}
        </nav>
    );
}

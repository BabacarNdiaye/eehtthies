import Card from '@/Components/Admin/Card';
import Drawer from '@/Components/Admin/Drawer';
import { Select } from '@/Components/Admin/Field';
import { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import ActionsMenu from '@/Components/Admin/Students/ActionsMenu';
import ClassOverview from '@/Components/Admin/Students/ClassOverview';
import DirectoryView from '@/Components/Admin/Students/DirectoryView';
import ScopeNavigator from '@/Components/Admin/Students/ScopeNavigator';
import StudentPreview from '@/Components/Admin/Students/StudentPreview';
import Modal from '@/Components/Modal';
import useMediaQuery from '@/hooks/useMediaQuery';
import AdminLayout from '@/Layouts/AdminLayout';
import { confirmAction } from '@/lib/confirm';
import { fullName, Patch, queryFor, statusKeys, statusPlurals, StudentRow, StudentsPageProps } from '@/lib/students';
import { PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ClipboardList, LayoutGrid, Layers, List } from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type View = 'cards' | 'list';

const VIEW_KEY = 'eeht:students-view';

function storedView(): View {
    try {
        return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards';
    } catch {
        return 'cards';
    }
}

const chip = 'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 max-md:min-h-11';
const chipOn = 'border-ink-900 bg-ink-900 text-white';
const chipOff = 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50';

export default function Index(page: StudentsPageProps) {
    const { mode, filters, defaults, years, allYearsCount, tree, stats, statusCounts, incompleteCount, scope, elsewhere, canSeeFinance } = page;
    const { auth } = usePage<PageProps>().props;

    const has = (permission: string) => auth.permissions.includes(permission);
    const can = {
        edit: has('modifier_eleves'),
        delete: has('supprimer_eleves'),
        card: has('exporter_eleves'),
        add: has('ajouter_eleves'),
        export: has('exporter_eleves'),
        import: has('ajouter_eleves'),
        collect: has('ajouter_comptabilite'),
    };

    // Le tableau n'est proposé qu'à partir de lg : plus étroit, il défilerait (la coque de l'administration est alors celle du téléphone).
    const wide = useMediaQuery('(min-width: 1024px)');
    const isXl = useMediaQuery('(min-width: 1280px)');

    const [search, setSearch] = useState(filters.search);
    const [view, setViewState] = useState<View>(storedView);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<StudentRow | null>(null);
    const [scopeOpen, setScopeOpen] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [flashId, setFlashId] = useState<number | null>(filters.highlight);
    const sentSearch = useRef(filters.search);
    const firstRender = useRef(true);

    const importForm = useForm({ file: null as File | null });

    const hrefFor = (patch: Patch) => route('admin.students.index', queryFor(filters, defaults, patch));

    const go = (patch: Patch, options: { replace?: boolean; scroll?: boolean } = {}) => {
        if ('search' in patch) sentSearch.current = patch.search ?? '';

        router.get(route('admin.students.index'), queryFor(filters, defaults, patch), {
            preserveState: true,
            preserveScroll: options.scroll ?? true,
            replace: options.replace ?? false,
        });
    };

    const setView = (next: View) => {
        setViewState(next);

        try {
            localStorage.setItem(VIEW_KEY, next);
        } catch {
            // Stockage indisponible (navigation privée…) : la préférence ne sera pas retenue d'une visite à l'autre.
        }
    };

    // Un voyant de chargement pour toute navigation de la page (puces, plan des promotions, pagination, recherche).
    useEffect(() => {
        const stop = [router.on('start', () => setLoading(true)), router.on('finish', () => setLoading(false))];

        return () => stop.forEach((off) => off());
    }, []);

    // La recherche part 300 ms après la dernière frappe ; une saisie vidée ailleurs (plan des promotions, retour du
    // navigateur) revient dans le champ, sans écraser ce qu'on est en train de taper.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        if (search.trim() === filters.search) return;

        const timeout = window.setTimeout(() => go({ search }, { replace: true }), 300);

        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (filters.search !== sentSearch.current) setSearch(filters.search);
    }, [filters.search]);

    // La fiche qu'on vient d'enregistrer : on la montre et un liseré doré la signale un instant.
    useEffect(() => {
        if (!filters.highlight) return;

        setFlashId(filters.highlight);

        // Inertia remet la page en haut une fois la navigation terminée, après le rendu : on s'y prend en deux temps.
        const reveal = () =>
            document.getElementById(`student-${filters.highlight}`)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        const timers = [window.setTimeout(reveal, 150), window.setTimeout(reveal, 500), window.setTimeout(() => setFlashId(null), 3500)];

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [filters.highlight]);

    useEffect(() => {
        if (isXl) setScopeOpen(false);
    }, [isXl]);

    const closeScope = useCallback(() => setScopeOpen(false), []);
    const openScope = useCallback(() => setScopeOpen(true), []);
    const closePreview = useCallback(() => setPreview(null), []);

    const destroy = async (student: StudentRow) => {
        if (await confirmAction(`Supprimer l'élève « ${fullName(student)} » ? Cette action est irréversible.`)) {
            router.delete(route('admin.students.destroy', student.id), { preserveScroll: true });
        }
    };

    const generateEmails = async () => {
        if (await confirmAction("Générer automatiquement une adresse e-mail pour chaque élève ou tuteur qui n'en a pas ?")) {
            router.post(route('admin.students.generateMissingEmails'), {}, { preserveScroll: true });
        }
    };

    const submitImport = (event: FormEvent) => {
        event.preventDefault();
        importForm.post(route('admin.students.import'), {
            forceFormData: true,
            onSuccess: () => {
                setShowImport(false);
                importForm.reset();
            },
        });
    };

    // « Nouvel élève » démarre sur la promotion qu'on regarde : formation, classe et année déjà choisies.
    const prefill: Record<string, number> = {};

    if (scope?.class) prefill.school_class_id = scope.class.id;
    else if (scope?.formation) prefill.formation_id = scope.formation.id;

    if (!prefill.school_class_id && filters.year !== 'all') prefill.academic_year_id = Number(filters.year);

    const newStudentHref = route('admin.students.create', prefill);
    const yearLabel = filters.year === 'all' ? 'Toutes les années' : (years.find((year) => String(year.id) === filters.year)?.label ?? '');

    const navigator = (onNavigate?: () => void) => (
        <ScopeNavigator
            mode={mode}
            tree={tree}
            filters={filters}
            years={years}
            allYearsCount={allYearsCount}
            hrefFor={hrefFor}
            onYearChange={(year) => go({ year })}
            onNavigate={onNavigate}
        />
    );

    const showEverything = () => go({ year: 'all', status: 'all' });

    // La recherche et les filtres : sous l'aperçu des promotions, ou entre l'en-tête de la promotion et ses élèves.
    const toolbar = (
        <Card className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <SearchField
                        name="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nom, matricule, téléphone…"
                        aria-label="Rechercher un élève par nom, matricule ou téléphone"
                    />
                    {mode === 'directory' && (
                        <Select name="sort" aria-label="Trier les élèves" value={filters.sort} onChange={(event) => go({ sort: event.target.value })} className="max-md:hidden md:!w-56">
                            <option value="name">Par classe, puis par nom</option>
                            <option value="recent">Ajoutés récemment</option>
                            <option value="matricule">Par matricule</option>
                        </Select>
                    )}
                    {mode === 'directory' && wide && (
                        <div role="group" aria-label="Affichage" className="inline-flex shrink-0 overflow-hidden rounded-lg border border-ink-200">
                            <button
                                type="button"
                                aria-label="Affichage en cartes"
                                aria-pressed={view === 'cards'}
                                onClick={() => setView('cards')}
                                className={`flex h-10 w-10 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 ${view === 'cards' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-50'}`}
                            >
                                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                aria-label="Affichage en liste"
                                aria-pressed={view === 'list'}
                                onClick={() => setView('list')}
                                className={`flex h-10 w-10 items-center justify-center border-l border-ink-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 ${view === 'list' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-50'}`}
                            >
                                <List className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>

                <div role="group" aria-label="Filtrer par statut" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                    {statusKeys.map((key) => {
                        const active = filters.status === key;
                        const count = statusCounts[key] ?? 0;

                        if (key !== 'actif' && count === 0 && !active) return null;

                        return (
                            <button key={key} type="button" aria-pressed={active} onClick={() => go({ status: key })} className={`${chip} ${active ? chipOn : chipOff}`}>
                                {statusPlurals[key]}
                                <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-ink-500'}`}>{count}</span>
                            </button>
                        );
                    })}
                    <button type="button" aria-pressed={filters.status === 'all'} onClick={() => go({ status: 'all' })} className={`${chip} ${filters.status === 'all' ? chipOn : chipOff}`}>
                        Tous
                        <span className={`text-xs tabular-nums ${filters.status === 'all' ? 'text-white/80' : 'text-ink-500'}`}>{statusCounts.all ?? 0}</span>
                    </button>
                    {(incompleteCount > 0 || filters.incomplete) && (
                        <button
                            type="button"
                            aria-pressed={filters.incomplete}
                            onClick={() => go({ incomplete: !filters.incomplete })}
                            className={`${chip} ${filters.incomplete ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
                        >
                            <ClipboardList className="h-4 w-4" aria-hidden="true" />À compléter
                            <span className={`text-xs tabular-nums ${filters.incomplete ? 'text-white' : 'text-amber-800'}`}>{incompleteCount}</span>
                        </button>
                    )}
                </div>
            </div>
        </Card>
    );

    return (
        <AdminLayout>
            <Head title="Élèves" />
            <PageHeader
                title="Élèves"
                subtitle="Dossiers des élèves, classés par niveau de formation, formation et classe."
                action={can.add ? { label: 'Nouvel élève', href: newStudentHref } : undefined}
            >
                <ActionsMenu filters={filters} can={{ export: can.export, import: can.import, edit: can.edit }} classId={scope?.class?.id ?? null} onImport={() => setShowImport(true)} onGenerateEmails={generateEmails} />
            </PageHeader>

            <Modal show={showImport} onClose={() => setShowImport(false)} maxWidth="md">
                <form onSubmit={submitImport} className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Importer des élèves</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Fichier CSV avec les colonnes matricule, first_name, last_name, birth_date, gender, phone, email, formation, status.{' '}
                        <a href={route('admin.students.import.template')} className="text-brand-600 underline">
                            Télécharger le modèle
                        </a>
                        .
                    </p>
                    <input
                        type="file"
                        aria-label="Fichier CSV"
                        accept=".csv,text/csv"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => importForm.setData('file', event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                    />
                    {importForm.errors.file && <p className="mt-2 text-xs text-red-600">{importForm.errors.file}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowImport(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-500 transition-colors duration-150 hover:bg-ink-100">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={importForm.processing || !importForm.data.file}
                            className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink-800 disabled:opacity-50"
                        >
                            {importForm.processing ? 'Importation…' : 'Importer'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="xl:grid xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start xl:gap-6">
                {/* Un simple bloc : la barre latérale de l'administration est déjà la zone « complémentaire » de la page, et le plan des promotions porte son propre repère « navigation ». */}
                <div className="hidden xl:sticky xl:top-24 xl:block">
                    <Card className="max-h-[calc(100vh-7.5rem)] overflow-y-auto p-3">{navigator()}</Card>
                </div>

                <div aria-busy={loading} className={`min-w-0 space-y-4 transition-opacity duration-200 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
                    {mode === 'overview' ? (
                        <>
                            {/* Sous xl, le plan des promotions est dans un volet : cette barre dit où l'on est et l'ouvre. */}
                            <button
                                type="button"
                                onClick={openScope}
                                aria-haspopup="dialog"
                                className="flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 text-left shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-gold-500 xl:hidden"
                            >
                                <Layers className="h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs text-ink-500">Promotion · {yearLabel}</span>
                                    <span className="block truncate font-semibold text-ink-900">{scope?.title ?? "Vue d'ensemble"}</span>
                                </span>
                                <span className="text-sm font-semibold text-gold-700">Changer</span>
                            </button>

                            {toolbar}

                            <ClassOverview
                                tree={tree}
                                stats={stats}
                                filters={filters}
                                hrefFor={hrefFor}
                                elsewhere={elsewhere}
                                onShowEverything={showEverything}
                                can={{ add: can.add, import: can.import }}
                                newStudentHref={newStudentHref}
                                onImport={() => setShowImport(true)}
                            />
                        </>
                    ) : (
                        <DirectoryView
                            page={page}
                            view={view}
                            wide={wide}
                            can={{ edit: can.edit, delete: can.delete, card: can.card, add: can.add }}
                            hrefFor={hrefFor}
                            newStudentHref={newStudentHref}
                            flashId={flashId}
                            toolbar={toolbar}
                            onChangeScope={openScope}
                            onOpen={setPreview}
                            onDelete={destroy}
                            onShowEverything={showEverything}
                            onClearSearch={() => {
                                setSearch('');
                                go({ search: '' }, { replace: true });
                            }}
                            onClearIncomplete={() => go({ incomplete: false })}
                        />
                    )}
                </div>
            </div>

            <StudentPreview student={preview} onClose={closePreview} can={{ edit: can.edit, card: can.card, collect: can.collect && canSeeFinance }} />

            <Drawer open={scopeOpen && !isXl} onClose={closeScope} title="Choisir une promotion">
                {navigator(closeScope)}
            </Drawer>
        </AdminLayout>
    );
}

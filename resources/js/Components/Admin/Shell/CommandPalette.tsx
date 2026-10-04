import { readRecents } from '@/lib/adminMemory';
import { matchPages, matchUtilityPages, NavGroup, QuickAction, searchTokens, startsAllWords, visibleQuickActions } from '@/lib/adminNav';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { router } from '@inertiajs/react';
import { CornerDownLeft, LucideIcon, Search } from 'lucide-react';
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
    groups: NavGroup[];
    permissions: readonly string[];
}

interface Entry {
    id: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
    /** Nom de la route à ouvrir. */
    href: string;
}

interface Section {
    title: string;
    entries: Entry[];
}

const fromAction = (action: QuickAction, prefix: string): Entry => ({
    id: `${prefix}:${action.href}`,
    label: action.label,
    icon: action.icon,
    href: action.href,
});

/** Sections affichées pour une saisie : récents et actions rapides quand elle est vide, sinon actions et pages qui correspondent. */
function buildSections(groups: NavGroup[], permissions: readonly string[], query: string): Section[] {
    const actions = visibleQuickActions(permissions);
    const trimmed = query.trim();

    if (!trimmed) {
        const known = new Map(groups.flatMap((group) => group.items.map((item) => [item.href, { item, group }] as const)));
        const recents: Entry[] = [];

        for (const name of readRecents()) {
            const found = known.get(name);

            if (found) {
                recents.push({ id: `recent:${name}`, label: found.item.label, hint: found.group.label ?? undefined, icon: found.item.icon, href: name });
            }
        }

        return [
            { title: 'Récents', entries: recents },
            { title: 'Actions rapides', entries: actions.map((action) => fromAction(action, 'action')) },
        ].filter((section) => section.entries.length > 0);
    }

    const tokens = searchTokens(trimmed);
    const matchingActions = actions.filter((action) => startsAllWords(action.label, tokens));
    const pages: Entry[] = [
        ...matchPages(groups, trimmed).map(({ item, group }) => ({
            id: `page:${item.href}`,
            label: item.label,
            hint: group.label ?? undefined,
            icon: item.icon,
            href: item.href,
        })),
        ...matchUtilityPages(trimmed).map((item) => ({ id: `page:${item.href}`, label: item.label, icon: item.icon, href: item.href })),
    ];

    return [
        { title: 'Actions rapides', entries: matchingActions.map((action) => fromAction(action, 'action')) },
        { title: 'Pages', entries: pages },
    ].filter((section) => section.entries.length > 0);
}

function Body({ onClose, groups, permissions }: Omit<Props, 'open'>) {
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);

    // Sur un écran tactile, headlessui ne donne pas le focus au champ (le clavier s'ouvrirait de lui-même) et le
    // garde sur la fenêtre. Ici l'utilisateur vient de toucher « Rechercher » pour écrire : on le donne nous-mêmes,
    // juste après celui de headlessui.
    useEffect(() => {
        queueMicrotask(() => inputRef.current?.focus());
    }, []);

    const sections = useMemo(() => {
        let index = 0;

        return buildSections(groups, permissions, query).map((section) => ({
            title: section.title,
            entries: section.entries.map((entry) => ({ ...entry, index: index++ })),
        }));
    }, [groups, permissions, query]);

    const flat = useMemo(() => sections.flatMap((section) => section.entries), [sections]);
    const optionId = (index: number) => `${listId}-option-${index}`;

    useEffect(() => {
        document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const go = (entry: Entry) => {
        onClose();
        router.visit(route(entry.href));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => (flat.length ? (index + 1) % flat.length : 0));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (flat[active]) go(flat[active]);
        }
    };

    return (
        <>
            <div className="flex shrink-0 items-center gap-3 border-b border-ink-100 px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <Search className="h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
                <input
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={flat[active] ? optionId(active) : undefined}
                    aria-autocomplete="list"
                    aria-label="Rechercher dans l'administration"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="go"
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="Rechercher une page, une action…"
                    className="h-14 min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink-900 placeholder:text-ink-500 focus:ring-0"
                />
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-2 py-2 text-sm font-medium text-ink-600 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 sm:hidden"
                >
                    Fermer
                </button>
                <kbd className="hidden rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-500 sm:block">Échap</kbd>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:max-h-[50vh]">
                {flat.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-ink-500">
                        {query.trim() ? 'Aucun résultat pour cette recherche.' : "Tapez le nom d'une rubrique ou d'une action."}
                    </p>
                ) : (
                    <ul id={listId} role="listbox" aria-label="Résultats">
                        {sections.map((section, sectionIndex) => (
                            <li key={section.title} role="presentation">
                                <div
                                    id={`${listId}-section-${sectionIndex}`}
                                    role="presentation"
                                    className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-500"
                                >
                                    {section.title}
                                </div>
                                <ul role="group" aria-labelledby={`${listId}-section-${sectionIndex}`}>
                                    {section.entries.map((entry) => {
                                        const Icon = entry.icon;
                                        const isActive = entry.index === active;

                                        return (
                                            <li
                                                key={entry.id}
                                                id={optionId(entry.index)}
                                                role="option"
                                                aria-selected={isActive}
                                                onMouseMove={() => setActive(entry.index)}
                                                onClick={() => go(entry)}
                                                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${isActive ? 'bg-gold-100' : ''}`}
                                            >
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-700">
                                                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-ink-900">{entry.label}</span>
                                                    {entry.hint && <span className="block truncate text-xs text-ink-500">{entry.hint}</span>}
                                                </span>
                                                {isActive && <CornerDownLeft className="hidden h-4 w-4 shrink-0 text-ink-500 sm:block" aria-hidden="true" />}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p role="status" className="sr-only">
                {flat.length} résultat{flat.length > 1 ? 's' : ''}
            </p>

            <div className="hidden shrink-0 items-center gap-4 border-t border-ink-100 px-4 py-2.5 text-xs text-ink-500 sm:flex">
                <span>↑ ↓ pour naviguer</span>
                <span>↵ pour ouvrir</span>
                <span>Échap pour fermer</span>
            </div>
        </>
    );
}

/**
 * Palette de recherche de l'administration (Ctrl/⌘ K, « / », ou le bouton Rechercher) : pages, actions rapides et
 * rubriques récentes selon les permissions du rôle. Plein écran sur téléphone, fenêtre centrée sur ordinateur.
 * Le corps n'existe que pendant l'ouverture : la saisie repart donc vide à chaque fois.
 */
export default function CommandPalette({ open, onClose, groups, permissions }: Props) {
    return (
        <Transition show={open}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 sm:overflow-y-auto sm:px-4 sm:pt-[12vh]">
                    <TransitionChild
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-2 sm:scale-95"
                    >
                        <DialogPanel className="flex h-full flex-col overflow-hidden bg-white shadow-elevated sm:mx-auto sm:h-auto sm:max-w-xl sm:rounded-2xl">
                            <Body onClose={onClose} groups={groups} permissions={permissions} />
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}

import BottomSheet from '@/Components/BottomSheet';
import Avatar from '@/Components/Connect/Avatar';
import { NavGroup } from '@/lib/adminNav';
import { haptic } from '@/lib/portal';
import { promptInstall, useCanInstall } from '@/lib/pwa';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Download, Globe, KeyRound, LayoutDashboard, LogOut, Search } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

interface Props {
    open: boolean;
    /** Doit être stable (useCallback) : le piège de focus de BottomSheet s'y accroche. */
    onClose: () => void;
    onSearch: () => void;
    groups: NavGroup[];
    current: string;
    profile: { name: string; subtitle: string | null; photo: string | null };
}

const tileIcon = 'flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors';
const tileLink =
    'flex w-full flex-col items-center gap-2 rounded-2xl text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500';
const tileTone = (active: boolean) => (active ? 'border-gold-300 bg-gold-100 text-ink-900' : 'border-leaf-200 bg-leaf-50 text-leaf-800');

/**
 * Feuille « Menu » de l'administration (téléphone et tablette). Premier écran : profil, bouton de recherche et une
 * tuile par groupe de rubriques ; toucher un groupe ouvre la liste de ses rubriques (un groupe d'une seule rubrique
 * y mène directement). La coque (fond, glisser pour fermer, Échap, piège de focus) est celle de BottomSheet.
 */
export default function AdminMenuSheet({ open, onClose, onSearch, groups, current, profile }: Props) {
    const canInstall = useCanInstall();
    const [groupLabel, setGroupLabel] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Le groupe sans libellé (le tableau de bord) ne s'ouvre jamais : sans ce garde, `null === null` le choisirait.
    const group = groupLabel ? (groups.find((candidate) => candidate.label === groupLabel) ?? null) : null;

    // À chaque ouverture on repart de la grille des groupes (avant la peinture : la feuille est encore hors écran).
    useLayoutEffect(() => {
        if (open) setGroupLabel(null);
    }, [open]);

    const enterGroup = (label: string) => {
        haptic();
        setGroupLabel(label);
        requestAnimationFrame(() => containerRef.current?.querySelector<HTMLElement>('[data-sheet-back]')?.focus());
    };

    const leaveGroup = () => {
        setGroupLabel(null);
        requestAnimationFrame(() => containerRef.current?.querySelector<HTMLElement>('a[href], button')?.focus());
    };

    const topLevel = groups.filter((candidate) => !candidate.label).flatMap((candidate) => candidate.items);
    const labelled = groups.filter((candidate) => candidate.label);

    return (
        <BottomSheet open={open} onClose={onClose} label="Menu">
            <div ref={containerRef}>
                {group ? (
                    <>
                        <div className="mx-5 flex items-center gap-2 border-b border-ink-100 pb-3">
                            <button
                                type="button"
                                data-sheet-back
                                onClick={leaveGroup}
                                aria-label="Retour au menu"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-700 outline-none active:bg-ink-100 focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                            </button>
                            <h2 className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-ink-900">{group.label}</h2>
                        </div>

                        <ul className="px-3 pt-2">
                            {group.items.map((item) => {
                                const isActive = item.active(current);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={route(item.href)}
                                            onClick={() => {
                                                haptic();
                                                onClose();
                                            }}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`flex min-h-[3.25rem] items-center gap-3 rounded-2xl px-3 py-2 outline-none active:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                                isActive ? 'bg-gold-100' : ''
                                            }`}
                                        >
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tileTone(isActive)}`}>
                                                <item.icon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                            <span className={`min-w-0 flex-1 text-sm ${isActive ? 'font-bold text-ink-900' : 'font-medium text-ink-800'}`}>
                                                {item.label}
                                            </span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                ) : (
                    <>
                        <div className="mx-5 flex items-center gap-3.5 border-b border-ink-100 pb-4">
                            <Avatar name={profile.name} src={profile.photo} size="md" />
                            <div className="min-w-0">
                                <p className="truncate font-serif text-lg font-bold text-ink-900">{profile.name}</p>
                                {profile.subtitle && <p className="truncate text-sm text-ink-500">{profile.subtitle}</p>}
                            </div>
                        </div>

                        <div className="px-5 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onSearch();
                                }}
                                aria-haspopup="dialog"
                                className="flex h-12 w-full items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50 px-4 text-left text-sm text-ink-500 outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
                                Rechercher une page, une action…
                            </button>
                        </div>

                        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5 pt-5">
                            {topLevel.map((item) => {
                                const isActive = item.active(current);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={route(item.href)}
                                            onClick={() => {
                                                haptic();
                                                onClose();
                                            }}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={tileLink}
                                        >
                                            <span className={`${tileIcon} ${tileTone(isActive)}`}>
                                                <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
                                            </span>
                                            <span className={`text-xs leading-tight ${isActive ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}

                            {labelled.map((candidate) => {
                                const Icon = candidate.icon ?? LayoutDashboard;
                                const isActive = candidate.items.some((item) => item.active(current));

                                if (candidate.items.length === 1) {
                                    const only = candidate.items[0];

                                    return (
                                        <li key={candidate.label}>
                                            <Link
                                                href={route(only.href)}
                                                onClick={() => {
                                                    haptic();
                                                    onClose();
                                                }}
                                                aria-current={isActive ? 'page' : undefined}
                                                className={tileLink}
                                            >
                                                <span className={`${tileIcon} ${tileTone(isActive)}`}>
                                                    <only.icon className="h-6 w-6" aria-hidden="true" />
                                                </span>
                                                <span className={`text-xs leading-tight ${isActive ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
                                                    {only.label}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                }

                                return (
                                    <li key={candidate.label}>
                                        <button type="button" onClick={() => enterGroup(candidate.label as string)} className={tileLink}>
                                            <span className={`${tileIcon} ${tileTone(isActive)}`}>
                                                <Icon className="h-6 w-6" aria-hidden="true" />
                                            </span>
                                            <span className={`text-xs leading-tight ${isActive ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
                                                {candidate.label}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        <ul className="mx-5 mt-6 grid grid-cols-3 gap-x-3 gap-y-5 border-t border-ink-100 pt-5">
                            <li>
                                <Link href={route('admin.password')} onClick={onClose} className={tileLink}>
                                    <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                                        <KeyRound className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <span className="text-xs font-medium leading-tight text-ink-700">Mot de passe</span>
                                </Link>
                            </li>
                            <li>
                                <Link href={route('home')} onClick={onClose} className={tileLink}>
                                    <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                                        <Globe className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <span className="text-xs font-medium leading-tight text-ink-700">Site public</span>
                                </Link>
                            </li>
                            {canInstall && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await promptInstall();
                                            onClose();
                                        }}
                                        className={tileLink}
                                    >
                                        <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                                            <Download className="h-6 w-6" aria-hidden="true" />
                                        </span>
                                        <span className="text-xs font-medium leading-tight text-ink-700">Installer l'application</span>
                                    </button>
                                </li>
                            )}
                            <li>
                                <Link href={route('logout')} method="post" as="button" className={tileLink}>
                                    <span className={`${tileIcon} border-red-100 bg-red-50 text-red-600`}>
                                        <LogOut className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <span className="text-xs font-medium leading-tight text-red-600">Déconnexion</span>
                                </Link>
                            </li>
                        </ul>
                    </>
                )}
            </div>
        </BottomSheet>
    );
}

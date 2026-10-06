import SiteLogo from '@/Components/SiteLogo';
import { sidebarMemory } from '@/lib/adminMemory';
import { NavGroup } from '@/lib/adminNav';
import { Link } from '@inertiajs/react';
import { ChevronDown, KeyRound, LogOut, Wallet } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

interface Props {
    groups: NavGroup[];
    current: string;
    name: string;
    role?: string;
}

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400';

/**
 * Barre latérale d'ordinateur (≥ lg) : un groupe ouvert à la fois, rubrique active signalée par aria-current. Les
 * groupes refermés sortent du parcours clavier (visibility), et la barre retrouve son défilement et son groupe
 * ouvert d'une page à l'autre (la coque est remontée à chaque navigation).
 */
export default function Sidebar({ groups, current, name, role }: Props) {
    const baseId = useId();
    const navRef = useRef<HTMLElement>(null);
    const activeGroup = groups.find((group) => group.label && group.items.some((item) => item.active(current)))?.label ?? null;
    const [openGroup, setOpenGroup] = useState<string | null>(activeGroup ?? sidebarMemory.group ?? null);

    useLayoutEffect(() => {
        const nav = navRef.current;

        if (!nav) return;

        nav.scrollTop = sidebarMemory.scrollTop;
        nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    }, []);

    const toggle = (label: string) => {
        const next = openGroup === label ? null : label;

        sidebarMemory.group = next;
        setOpenGroup(next);
    };

    return (
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/5 bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 lg:flex">
            <div className="relative flex h-16 shrink-0 items-center gap-2.5 px-5">
                <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-gold-500/60 via-gold-500/20 to-transparent" aria-hidden="true" />
                <SiteLogo size={36} tone="gold" />
                <div className="flex flex-col leading-tight">
                    <span className="font-serif text-sm font-bold text-white">EEHT Admin</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/80">Gestion intégrée</span>
                </div>
            </div>

            <nav
                ref={navRef}
                aria-label="Navigation de l'administration"
                onScroll={(event) => {
                    sidebarMemory.scrollTop = event.currentTarget.scrollTop;
                }}
                className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4"
            >
                {groups.map((group, index) => {
                    if (!group.label) {
                        return group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.active(current);

                            return (
                                <Link
                                    key={item.href}
                                    href={route(item.href)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                                        isActive ? 'bg-white/10 text-white shadow-inner shadow-black/10' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold-400" aria-hidden="true" />}
                                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-gold-300' : ''}`} aria-hidden="true" />
                                    {item.label}
                                </Link>
                            );
                        });
                    }

                    const GroupIcon = group.icon;
                    const panelId = `${baseId}-${index}`;
                    const isOpen = openGroup === group.label;
                    const hasActiveChild = group.items.some((item) => item.active(current));

                    return (
                        <div key={group.label} className="pb-1">
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() => toggle(group.label as string)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                                    isOpen
                                        ? 'bg-white/5 text-white'
                                        : hasActiveChild
                                          ? 'text-gold-300'
                                          : 'text-ink-300 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {GroupIcon && <GroupIcon className={`h-5 w-5 shrink-0 ${hasActiveChild ? 'text-gold-300' : ''}`} aria-hidden="true" />}
                                <span className="flex-1 text-balance text-left">{group.label}</span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-fluid motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                                    aria-hidden="true"
                                />
                            </button>
                            <div
                                id={panelId}
                                className={`grid transition-all duration-300 ease-fluid motion-reduce:transition-none ${
                                    isOpen ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
                                }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="mt-1 space-y-0.5 rounded-xl bg-black/25 p-1.5 shadow-inner shadow-black/20 ring-1 ring-inset ring-white/5">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = item.active(current);

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={route(item.href)}
                                                    aria-current={isActive ? 'page' : undefined}
                                                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-balance text-sm font-medium transition-colors duration-200 ${focusRing} ${
                                                        isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {isActive && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gold-400" aria-hidden="true" />}
                                                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-gold-300' : ''}`} aria-hidden="true" />
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div
                        aria-hidden="true"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-ink-950 ring-2 ring-white/10"
                    >
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{name}</p>
                        <p className="truncate text-xs capitalize text-ink-300">{role}</p>
                    </div>
                </div>
                <Link
                    href={route('admin.my-payslips.index')}
                    aria-current={current.startsWith('admin.my-payslips') ? 'page' : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                        current.startsWith('admin.my-payslips') ? 'bg-white/5 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <Wallet className="h-4 w-4" aria-hidden="true" /> Ma paie
                </Link>
                <Link
                    href={route('admin.password')}
                    aria-current={current === 'admin.password' ? 'page' : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                        current === 'admin.password' ? 'bg-white/5 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <KeyRound className="h-4 w-4" aria-hidden="true" /> Mot de passe
                </Link>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-white/5 hover:text-white ${focusRing}`}
                >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Déconnexion
                </Link>
            </div>
        </aside>
    );
}

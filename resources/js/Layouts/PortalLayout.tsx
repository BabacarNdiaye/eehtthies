import { Link, usePage } from '@inertiajs/react';
import {
    Calendar,
    CalendarOff,
    ChevronLeft,
    ClipboardCheck,
    GraduationCap,
    Home,
    KeyRound,
    Library,
    LogOut,
    Medal,
    Menu,
    MessageCircle,
    NotebookText,
    PenSquare,
    Receipt,
    Users,
    X,
} from 'lucide-react';
import { PropsWithChildren, useState } from 'react';
import { PageProps } from '@/types';
import SiteLogo from '@/Components/SiteLogo';
import NotificationBell from '@/Components/NotificationBell';
import useAutoPushSubscribe from '@/hooks/useAutoPushSubscribe';

export interface PortalNavItem {
    label: string;
    href: string;
    active: (current: string) => boolean;
}

function iconFor(href: string) {
    if (href.includes('dashboard')) return Home;
    if (href.includes('timetable')) return Calendar;
    if (href.includes('grades')) return GraduationCap;
    if (href.includes('exams')) return PenSquare;
    if (href.includes('lesson-log')) return NotebookText;
    if (href.includes('attendance')) return ClipboardCheck;
    if (href.includes('leave')) return CalendarOff;
    if (href.includes('skills')) return Medal;
    if (href.includes('library')) return Library;
    if (href.includes('invoices')) return Receipt;
    if (href.includes('connect')) return MessageCircle;
    if (href.includes('classes') || href.includes('child')) return Users;
    return Home;
}

export default function PortalLayout({
    title,
    nav,
    children,
}: PropsWithChildren<{ title: string; nav: PortalNavItem[] }>) {
    const { props, component } = usePage<PageProps>();
    const { auth, flash } = props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useAutoPushSubscribe();
    const currentRoute = route().current() ?? component;
    const rolePrefix = nav[0]?.href.split('.')[0] ?? 'student';
    const messagesHref = route('connect.index');
    const passwordHref = route(`${rolePrefix}.password`);

    const SidebarContent = (
        <>
            <div className="flex h-16 items-center gap-2.5 px-5">
                <SiteLogo size={36} tone="gold" />
                <div className="flex flex-col leading-tight">
                    <span className="font-serif text-sm font-bold text-white">{title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-ink-400">EEHT de Thiès</span>
                </div>
            </div>
            <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {nav.map((item) => {
                    const Icon = iconFor(item.href);
                    const isActive = item.active(currentRoute as string);
                    return (
                        <Link
                            key={item.href}
                            href={route(item.href)}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                isActive ? 'bg-gold-500 text-ink-900' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className="h-4.5 w-4.5 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-semibold text-white">
                        {auth.user?.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{auth.user?.name}</p>
                        <p className="truncate text-xs text-ink-400">{auth.roles?.[0]}</p>
                    </div>
                </div>
                <Link
                    href={passwordHref}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        currentRoute === `${rolePrefix}.password`
                            ? 'bg-white/5 text-white'
                            : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <KeyRound className="h-4 w-4" /> Mot de passe
                </Link>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                    <LogOut className="h-4 w-4" /> Déconnexion
                </Link>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-ink-50">
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink-900 lg:flex">{SidebarContent}</aside>

            <div
                className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
                aria-hidden={!sidebarOpen}
            >
                <div
                    className={`absolute inset-0 bg-ink-950/60 transition-opacity duration-300 ${
                        sidebarOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                />
                <aside
                    className={`absolute inset-y-0 left-0 flex w-64 transform flex-col bg-ink-900 transition-transform duration-300 ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <button
                        className="absolute right-3 top-4 rounded-md p-1 text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Fermer le menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    {SidebarContent}
                </aside>
            </div>

            <div className="flex flex-1 flex-col lg:pl-64">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 sm:px-6">
                    <div className="flex items-center gap-1 lg:hidden">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Ouvrir le menu"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        {!route().current(`${rolePrefix}.dashboard`) && (
                            <button
                                onClick={() => window.history.back()}
                                aria-label="Retour"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="hidden text-sm text-ink-500 lg:block">{title} — EEHT de Thiès</div>
                    <div className="flex items-center gap-3">
                        <NotificationBell href={messagesHref} />
                        <Link
                            href={route('home')}
                            className="hidden text-sm font-medium text-ink-600 transition-colors duration-150 hover:text-gold-600 sm:block"
                        >
                            Voir le site public →
                        </Link>
                    </div>
                </header>

                {flash?.success && (
                    <div className="mx-4 mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:mx-6">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6">
                        {flash.error}
                    </div>
                )}

                <main className="flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
            </div>
        </div>
    );
}

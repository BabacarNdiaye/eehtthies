import BottomSheet from '@/Components/BottomSheet';
import Avatar from '@/Components/Connect/Avatar';
import { haptic } from '@/lib/portal';
import { promptInstall, useCanInstall } from '@/lib/pwa';
import { Link } from '@inertiajs/react';
import { Download, Globe, KeyRound, LogOut, LucideIcon } from 'lucide-react';

export interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
    active: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    profile: { name: string; subtitle: string | null; photo: string | null };
    items: MenuItem[];
    passwordHref: string;
}

const tileIcon = 'flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors';

/**
 * Feuille « Menu » (téléphone et tablette) : profil en tête puis toutes les rubriques de l'espace en grille de
 * tuiles, comme l'écran Menu d'une application mobile. La coque (fond, glisser pour fermer, Échap, piège de focus)
 * est celle de BottomSheet, partagée avec le site public.
 */
export default function MenuSheet({ open, onClose, profile, items, passwordHref }: Props) {
    const canInstall = useCanInstall();

    return (
        <BottomSheet open={open} onClose={onClose} label="Menu">
            <div className="mx-5 flex items-center gap-3.5 border-b border-ink-100 pb-4">
                <Avatar name={profile.name} src={profile.photo} size="md" />
                <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-bold text-ink-900">{profile.name}</p>
                    {profile.subtitle && <p className="truncate text-sm text-ink-500">{profile.subtitle}</p>}
                </div>
            </div>

            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5 pt-5">
                {items.map((item) => (
                    <li key={item.href}>
                        <Link
                            href={route(item.href)}
                            onClick={() => {
                                haptic();
                                onClose();
                            }}
                            aria-current={item.active ? 'page' : undefined}
                            className="flex flex-col items-center gap-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500 rounded-2xl"
                        >
                            <span
                                className={`${tileIcon} ${
                                    item.active ? 'border-gold-300 bg-gold-100 text-ink-900' : 'border-leaf-200 bg-leaf-50 text-leaf-800'
                                }`}
                            >
                                <item.icon className="h-6 w-6" />
                            </span>
                            <span className={`text-xs leading-tight ${item.active ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>
                                {item.label}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <ul className="mx-5 mt-6 grid grid-cols-3 gap-x-3 gap-y-5 border-t border-ink-100 pt-5">
                <li>
                    <Link
                        href={passwordHref}
                        onClick={onClose}
                        className="flex flex-col items-center gap-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500 rounded-2xl"
                    >
                        <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                            <KeyRound className="h-6 w-6" />
                        </span>
                        <span className="text-xs font-medium leading-tight text-ink-700">Mot de passe</span>
                    </Link>
                </li>
                <li>
                    <Link
                        href={route('home')}
                        onClick={onClose}
                        className="flex flex-col items-center gap-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500 rounded-2xl"
                    >
                        <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                            <Globe className="h-6 w-6" />
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
                            className="flex w-full flex-col items-center gap-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500 rounded-2xl"
                        >
                            <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                                <Download className="h-6 w-6" />
                            </span>
                            <span className="text-xs font-medium leading-tight text-ink-700">Installer l'application</span>
                        </button>
                    </li>
                )}
                <li>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex w-full flex-col items-center gap-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500 rounded-2xl"
                    >
                        <span className={`${tileIcon} border-red-100 bg-red-50 text-red-600`}>
                            <LogOut className="h-6 w-6" />
                        </span>
                        <span className="text-xs font-medium leading-tight text-red-600">Déconnexion</span>
                    </Link>
                </li>
            </ul>
        </BottomSheet>
    );
}

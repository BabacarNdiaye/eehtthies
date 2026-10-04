import SiteLogo from '@/Components/SiteLogo';
import { haptic } from '@/lib/portal';
import { Link } from '@inertiajs/react';
import { Bell, ChevronLeft, Search } from 'lucide-react';

interface Props {
    /** Groupe de la page (« Pédagogie — Scolarité »), ou null sur le tableau de bord. */
    caption: string | null;
    /** Adresse de retour d'une fiche, d'un formulaire de création ou de modification ; null sur une page d'index. */
    backHref: string | null;
    unread: number;
    /** Donné sur les écrans de saisie, où la barre du bas (et sa loupe) est remplacée par la barre Enregistrer. */
    onSearch?: () => void;
}

const roundButton =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors active:bg-ink-100 focus-visible:ring-2 focus-visible:ring-gold-500';

/**
 * Barre haute du téléphone et de la tablette (< lg), compacte : retour (sous-pages) ou logo (pages d'index),
 * groupe de la page, cloche des messages. Le titre de la page reste celui de son h1, juste en dessous.
 */
export default function MobileTopBar({ caption, backHref, unread, onSearch }: Props) {
    return (
        <header
            className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 px-2 backdrop-blur-xl lg:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="flex h-14 items-center gap-1">
                {backHref ? (
                    <Link href={backHref} onClick={() => haptic()} aria-label="Retour" className={`${roundButton} text-ink-700`}>
                        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                    </Link>
                ) : (
                    <Link href={route('admin.dashboard')} aria-label="Tableau de bord" className={roundButton}>
                        <SiteLogo size={32} tone="gold" />
                    </Link>
                )}

                <p className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-ink-700">{caption ?? 'EEHT Admin'}</p>

                {onSearch && (
                    <button
                        type="button"
                        onClick={() => {
                            haptic();
                            onSearch();
                        }}
                        aria-haspopup="dialog"
                        aria-label="Rechercher"
                        className={`${roundButton} text-ink-600`}
                    >
                        <Search className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}

                <Link
                    href={route('connect.index')}
                    aria-label={unread > 0 ? `Messages (${unread} non lus)` : 'Messages'}
                    className={`${roundButton} relative text-ink-600`}
                >
                    <Bell className="h-5 w-5" aria-hidden="true" />
                    {unread > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Link>
            </div>
        </header>
    );
}

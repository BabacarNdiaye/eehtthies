import SiteLogo from '@/Components/SiteLogo';
import { FeedItem } from '@/lib/portal';
import { Link } from '@inertiajs/react';
import { Megaphone, Newspaper, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const GAP = 12; // gap-3

function timeAgo(iso: string): string {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);

    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
    if (minutes < 10080) return `il y a ${Math.round(minutes / 1440)} j`;

    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function slideStyle(item: FeedItem): string {
    if (item.kind === 'news') return 'from-brand-600 to-ink-800';
    if (item.priority === 'urgente') return 'from-red-600 to-orange-500';
    if (item.priority === 'importante') return 'from-amber-500 to-orange-500';

    return 'from-ink-800 to-brand-700';
}

function Slide({ item }: { item: FeedItem }) {
    const Icon = item.kind === 'news' ? Newspaper : item.priority === 'urgente' ? TriangleAlert : Megaphone;
    const label = item.kind === 'news' ? 'Actualité' : item.priority === 'urgente' ? 'Urgent' : item.priority === 'importante' ? 'Important' : 'Annonce';

    return (
        <Link
            href={item.url}
            className={`relative flex h-40 w-[84%] max-w-sm shrink-0 snap-center flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${slideStyle(item)}`}
        >
            {item.image && (
                <>
                    <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-ink-950/10" />
                </>
            )}
            <span className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" />
                {label}
                {item.unread && <span className="h-2 w-2 rounded-full bg-white ring-2 ring-white/40" aria-label="Non lu" />}
            </span>
            <span className="relative">
                {/* Pas de « block » : il annulerait le display -webkit-box de line-clamp. */}
                <span className="line-clamp-2 font-serif text-lg font-bold leading-snug">{item.title}</span>
                {item.excerpt && <span className="mt-1 line-clamp-2 text-xs text-white/80">{item.excerpt}</span>}
            </span>
            <span className="relative text-[11px] text-white/70">{timeAgo(item.date)}</span>
        </Link>
    );
}

function WelcomeSlide() {
    return (
        <div className="relative flex h-40 w-full shrink-0 snap-center items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-800 to-brand-700 p-5 text-white shadow-soft">
            <SiteLogo size={56} tone="gold" />
            <div>
                <p className="font-serif text-lg font-bold leading-snug">Bienvenue dans votre espace</p>
                <p className="mt-1 text-xs text-white/80">Les annonces de l'école et les actualités apparaîtront ici.</p>
            </div>
        </div>
    );
}

/**
 * Carrousel « À la une » : cartes qui se balayent au doigt (CSS scroll-snap), pastilles de position et
 * défilement automatique, interrompu au toucher et désactivé si l'utilisateur préfère moins d'animations.
 */
export default function Carousel({ items }: { items: FeedItem[] }) {
    const track = useRef<HTMLDivElement>(null);
    const paused = useRef(false);
    const resumeTimer = useRef<ReturnType<typeof setTimeout>>();
    const [index, setIndex] = useState(0);

    const step = () => {
        const first = track.current?.firstElementChild as HTMLElement | null;

        return first ? first.offsetWidth + GAP : 0;
    };

    const onScroll = () => {
        const size = step();

        if (size > 0 && track.current) setIndex(Math.round(track.current.scrollLeft / size));
    };

    const pause = () => {
        paused.current = true;
        clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(() => (paused.current = false), 8000);
    };

    useEffect(() => {
        if (items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const id = setInterval(() => {
            if (paused.current || document.visibilityState === 'hidden' || !track.current) return;

            const next = (Math.round(track.current.scrollLeft / step()) + 1) % items.length;
            track.current.scrollTo({ left: next * step(), behavior: 'smooth' });
        }, 6000);

        return () => {
            clearInterval(id);
            clearTimeout(resumeTimer.current);
        };
    }, [items.length]);

    return (
        <section aria-label="À la une">
            <div
                ref={track}
                onScroll={onScroll}
                onPointerDown={pause}
                onFocus={pause}
                className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            >
                {items.length === 0 ? <WelcomeSlide /> : items.map((item) => <Slide key={item.id} item={item} />)}
            </div>
            {items.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                    {items.map((item, i) => (
                        <span
                            key={item.id}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-ink-800' : 'w-1.5 bg-ink-200'}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

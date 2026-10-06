import SiteLogo from '@/Components/SiteLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-ink-950">
            <div className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-[#6b1338] pb-16 pt-10">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl" />
                <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-gold-500/10 blur-3xl" />
                <div className="pointer-events-none absolute right-10 top-32 h-16 w-16 rounded-2xl border border-white/10" />

                <Link href="/" className="relative z-10 flex flex-col items-center gap-3 px-4">
                    <SiteLogo size={56} tone="gold" />
                    <span className="text-center">
                        <span className="block font-serif text-lg font-bold text-white">
                            EEHT de Thiès
                        </span>
                        <span className="block text-[11px] uppercase tracking-widest text-gold-300/80">
                            Espace membres
                        </span>
                    </span>
                </Link>
            </div>

            <main className="relative z-10 mx-auto -mt-8 w-full max-w-md px-4 pb-12 sm:px-6">
                <div className="overflow-hidden rounded-3xl bg-white px-6 py-8 shadow-2xl sm:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

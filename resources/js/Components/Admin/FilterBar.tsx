import Card from '@/Components/Admin/Card';
import { TextInput } from '@/Components/Admin/Field';
import { Search, SlidersHorizontal } from 'lucide-react';
import { InputHTMLAttributes, ReactNode, useId, useState } from 'react';

/** Champ de recherche d'une liste : icône, et nom accessible repris du texte d'invite si on n'en donne pas. */
export function SearchField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className={`relative flex-1 ${className}`}>
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
            />
            <TextInput type="search" enterKeyHint="search" autoComplete="off" aria-label={props.placeholder} className="pl-9" {...props} />
        </div>
    );
}

/**
 * Barre de recherche et de filtres d'une liste. Ordinateur et tablette : tout sur une ligne. Téléphone : la
 * recherche en pleine largeur et les filtres derrière un bouton « Filtres (n) » ; ils restent dans la page
 * (masqués, jamais démontés) : la valeur d'un filtre n'est pas perdue en refermant.
 */
export default function FilterBar({ search, activeCount = 0, children }: { search: ReactNode; activeCount?: number; children?: ReactNode }) {
    const panelId = useId();
    const [open, setOpen] = useState(false);

    return (
        <Card className="mb-6 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 md:flex-1">
                    {search}
                    {children && (
                        <button
                            type="button"
                            onClick={() => setOpen((value) => !value)}
                            aria-expanded={open}
                            aria-controls={panelId}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 md:hidden"
                        >
                            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                            Filtres
                            {activeCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1.5 text-xs font-semibold text-white">
                                    {activeCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
                {children && (
                    <div id={panelId} className={`${open ? 'grid' : 'hidden'} gap-3 md:contents md:[&>select]:w-52`}>
                        {children}
                    </div>
                )}
            </div>
        </Card>
    );
}

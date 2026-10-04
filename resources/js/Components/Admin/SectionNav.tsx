import { useEffect, useState } from 'react';

export interface Section {
    /** Identifiant (attribut `id`) de la carte ou du bloc à atteindre. */
    id: string;
    label: string;
}

/**
 * Raccourcis vers les sections d'une longue page (Paramètres : 8 cartes, plus de 4 000 px sur téléphone). Une
 * rangée de pastilles collée sous la barre haute, qui défile en travers ; la section visible est mise en valeur.
 * Téléphone et tablette seulement (< lg) : sur ordinateur la page tient dans l'écran à force de défiler.
 */
export default function SectionNav({ sections }: { sections: Section[] }) {
    const [active, setActive] = useState(sections[0]?.id ?? '');

    useEffect(() => {
        const visible = new Map<string, number>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
                    else visible.delete(entry.target.id);
                }

                // La section active est la plus haute de celles qui sont dans la bande d'observation.
                const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];

                if (top) setActive(top[0]);
            },
            { rootMargin: '-120px 0px -55% 0px' },
        );

        sections.forEach(({ id }) => {
            const element = document.getElementById(id);

            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [sections]);

    // La pastille de la section visible reste visible dans la rangée, qui défile en travers.
    useEffect(() => {
        document.querySelector(`[data-section-pill="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [active]);

    const go = (id: string) => {
        const element = document.getElementById(id);

        if (!element) return;

        setActive(id);
        element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };

    return (
        <nav
            aria-label="Sections de la page"
            className="scrollbar-none sticky top-14 z-20 -mx-4 mb-4 overflow-x-auto border-b border-ink-100 bg-ink-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
        >
            <ul className="flex gap-2 whitespace-nowrap">
                {sections.map((section) => (
                    <li key={section.id}>
                        <a
                            href={`#${section.id}`}
                            data-section-pill={section.id}
                            onClick={(event) => {
                                event.preventDefault();
                                go(section.id);
                            }}
                            aria-current={active === section.id ? 'true' : undefined}
                            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active === section.id
                                    ? 'border-ink-900 bg-ink-900 text-white'
                                    : 'border-ink-200 bg-white text-ink-700 active:bg-ink-100'
                            }`}
                        >
                            {section.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

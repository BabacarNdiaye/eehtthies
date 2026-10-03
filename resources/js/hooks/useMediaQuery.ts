import { useEffect, useState } from 'react';

/** Suit une media query CSS (p. ex. « (min-width: 1024px) ») et se met à jour quand elle change. */
export default function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

    useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = () => setMatches(list.matches);

        onChange();
        list.addEventListener('change', onChange);

        return () => list.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

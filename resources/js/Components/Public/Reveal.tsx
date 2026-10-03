import { PropsWithChildren, useEffect, useRef, useState } from 'react';

/**
 * Fait apparaître ses enfants en fondu et en glissement la première fois qu'ils entrent dans la zone visible.
 * Se rabat sur un affichage complet immédiat si IntersectionObserver n'est pas disponible, pour que rien ne
 * reste jamais caché.
 */
export default function Reveal({
    children,
    delay = 0,
    className = '',
}: PropsWithChildren<{ delay?: number; className?: string }>) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
            className={`transition-all duration-700 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            } ${className}`}
        >
            {children}
        </div>
    );
}

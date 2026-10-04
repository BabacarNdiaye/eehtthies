import { InertiaLinkProps, Link } from '@inertiajs/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Tone = 'default' | 'danger';

// 32 px sur ordinateur (comme l'ancien `p-2` autour d'une icône de 16 px), 44 px au doigt sur téléphone.
const base =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-40 max-md:h-11 max-md:w-11';

const tones: Record<Tone, string> = {
    default: 'text-ink-500 hover:bg-ink-100 hover:text-ink-700',
    danger: 'text-red-600 hover:bg-red-50',
};

const classes = (tone: Tone, className?: string) => `${base} ${tones[tone]} ${className ?? ''}`.trim();

interface Common {
    /** Nom accessible du bouton, repris en infobulle : une icône seule n'en a pas. */
    label: string;
    tone?: Tone;
    className?: string;
}

/** Bouton réduit à une icône (Modifier, Supprimer…). Le nom est obligatoire ; le type par défaut est « button » : jamais d'envoi de formulaire involontaire. */
export function IconButton({
    label,
    tone = 'default',
    className,
    type = 'button',
    children,
    ...props
}: PropsWithChildren<Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'className'>>) {
    return (
        <button type={type} aria-label={label} title={label} className={classes(tone, className)} {...props}>
            {children}
        </button>
    );
}

/** Lien réduit à une icône (Modifier, Consulter…). Le nom est obligatoire. */
export function IconLink({
    label,
    tone = 'default',
    className,
    children,
    ...props
}: PropsWithChildren<Common & Omit<InertiaLinkProps, 'aria-label' | 'title' | 'className'>>) {
    return (
        <Link aria-label={label} title={label} className={classes(tone, className)} {...props}>
            {children}
        </Link>
    );
}

import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-gold-500 bg-gold-50 text-ink-900 focus:border-gold-600 focus:bg-gold-100 focus:text-ink-900'
                    : 'border-transparent text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-800 focus:border-ink-300 focus:bg-ink-50 focus:text-ink-800'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}

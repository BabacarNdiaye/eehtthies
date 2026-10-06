import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition duration-150 ease-in-out hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-40 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

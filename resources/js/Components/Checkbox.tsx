import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-ink-300 text-gold-600 shadow-sm focus:ring-gold-500 ' +
                className
            }
        />
    );
}

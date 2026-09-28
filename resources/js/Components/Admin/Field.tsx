import { PropsWithChildren } from 'react';

export function Field({
    label,
    error,
    required,
    hint,
    children,
}: PropsWithChildren<{
    label: string;
    error?: string;
    required?: boolean;
    hint?: string;
}>) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

const baseInputClass =
    'w-full rounded-lg border-ink-200 text-sm text-ink-900 shadow-sm focus:border-gold-500 focus:ring-gold-500';

export function TextInput(
    props: React.InputHTMLAttributes<HTMLInputElement>,
) {
    return <input {...props} className={`${baseInputClass} ${props.className ?? ''}`} />;
}

export function Textarea(
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
    return (
        <textarea {...props} className={`${baseInputClass} ${props.className ?? ''}`} />
    );
}

export function Select(
    props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
    return <select {...props} className={`${baseInputClass} ${props.className ?? ''}`} />;
}

export function Checkbox(
    props: React.InputHTMLAttributes<HTMLInputElement>,
) {
    return (
        <input
            type="checkbox"
            {...props}
            className={`rounded border-ink-300 text-gold-600 focus:ring-gold-500 ${props.className ?? ''}`}
        />
    );
}

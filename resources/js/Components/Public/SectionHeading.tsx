export default function SectionHeading({
    eyebrow,
    title,
    subtitle,
    align = 'center',
    dark = false,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    align?: 'center' | 'left';
    dark?: boolean;
}) {
    const alignClass = align === 'center' ? 'mx-auto text-center' : 'text-left';

    return (
        <div className={`max-w-2xl ${alignClass}`}>
            {eyebrow && (
                <span
                    className={`mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] ${
                        dark ? 'text-gold-400' : 'text-gold-600'
                    }`}
                >
                    {eyebrow}
                </span>
            )}
            <h2
                className={`font-serif text-3xl font-bold sm:text-4xl ${
                    dark ? 'text-white' : 'text-ink-900'
                }`}
            >
                {title}
            </h2>
            {subtitle && (
                <p
                    className={`mt-4 text-base leading-relaxed ${
                        dark ? 'text-ink-300' : 'text-ink-500'
                    }`}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );
}

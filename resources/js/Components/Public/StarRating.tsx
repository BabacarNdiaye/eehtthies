import { Star } from 'lucide-react';

export default function StarRating({
    rating,
    className = '',
}: {
    rating: number;
    className?: string;
}) {
    const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(rating));

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {stars.map((filled, i) => (
                <Star
                    key={i}
                    className={`h-4 w-4 ${
                        filled ? 'fill-gold-400 text-gold-400' : 'text-ink-200'
                    }`}
                />
            ))}
        </div>
    );
}

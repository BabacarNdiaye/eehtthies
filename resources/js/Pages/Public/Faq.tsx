import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import Reveal from '@/Components/Public/Reveal';
import { Faq as FaqType } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export default function Faq({ faqs }: { faqs: Record<string, FaqType[]> }) {
    const [openId, setOpenId] = useState<number | null>(null);
    const categories = Object.keys(faqs);

    return (
        <PublicLayout>
            <Head title="Foire aux questions - EEHT de Thiès" />

            <PageHero
                eyebrow="Besoin d'aide"
                title="Foire aux questions"
                subtitle="Retrouvez les réponses aux questions les plus fréquemment posées sur nos formations, l'admission et la vie à l'EEHT de Thiès."
            />

            <section className="py-12 sm:py-24">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {categories.length === 0 && (
                        <p className="text-center text-ink-500">
                            Aucune question n'est disponible pour le moment.
                        </p>
                    )}

                    <div className="space-y-12">
                        {categories.map((category, ci) => (
                            <Reveal key={category} delay={ci * 60}>
                                <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-bold text-ink-900">
                                    <HelpCircle className="h-5 w-5 text-gold-500" />
                                    {category}
                                </h2>
                                <div className="space-y-3">
                                    {faqs[category].map((faq) => {
                                        const isOpen = openId === faq.id;
                                        return (
                                            <div
                                                key={faq.id}
                                                className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm transition hover:shadow-soft"
                                            >
                                                <button
                                                    onClick={() =>
                                                        setOpenId(
                                                            isOpen
                                                                ? null
                                                                : faq.id,
                                                        )
                                                    }
                                                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                                                >
                                                    <span className="font-medium text-ink-900">
                                                        {faq.question}
                                                    </span>
                                                    <ChevronDown
                                                        className={`h-5 w-5 shrink-0 text-gold-500 transition-transform ${
                                                            isOpen
                                                                ? 'rotate-180'
                                                                : ''
                                                        }`}
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <div className="border-t border-ink-100 px-6 py-4 text-sm leading-relaxed text-ink-600">
                                                        {faq.answer}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal className="mt-16 flex flex-col items-center rounded-2xl bg-ink-900 px-8 py-10 text-center shadow-soft">
                        <MessageCircle className="h-8 w-8 text-gold-400" />
                        <h3 className="mt-4 font-serif text-xl font-bold text-white">
                            Vous ne trouvez pas de réponse à votre question ?
                        </h3>
                        <p className="mt-2 max-w-md text-sm text-ink-300">
                            Notre équipe est disponible pour répondre à toutes
                            vos interrogations.
                        </p>
                        <Link
                            href={route('pages.contact')}
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-ink-900 shadow-soft transition hover:-translate-y-0.5 hover:bg-gold-400"
                        >
                            Nous contacter
                        </Link>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
}

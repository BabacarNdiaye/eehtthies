import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, ShieldAlert } from 'lucide-react';

interface Receipt {
    numbers: string[];
    total: number;
    channel: string;
    paid_at: string;
    student: string;
    invoices: string[];
}

const fcfa = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

/** « 2026-10-06 » devient « 6 octobre 2026 », sans décalage de fuseau. */
const longDate = (iso: string) => {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function ReceiptVerification({ receipt }: { receipt: Receipt | null }) {
    return (
        <PublicLayout>
            <Head title="Vérification de reçu">
                <meta name="robots" content="noindex" />
            </Head>
            <PageHero
                eyebrow="Authentification"
                title="Vérification de reçu"
                subtitle="Ce service confirme qu'un reçu de paiement a bien été délivré par l'EEHT de Thiès, à partir de son QR code."
            />

            <section className="mx-auto max-w-2xl animate-fade-in-up px-4 py-16 sm:px-6 lg:px-8">
                {receipt ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-soft">
                        <BadgeCheck className="mx-auto mb-4 h-12 w-12 text-emerald-600" aria-hidden="true" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Reçu authentique</h2>
                        <p className="mt-2 text-sm text-ink-600">Ce paiement a bien été enregistré par l'Elite École Hôtelière et Touristique de Thiès.</p>

                        <dl className="mt-8 space-y-3 rounded-xl bg-white p-6 text-left shadow-sm">
                            <div className="flex justify-between gap-4 border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">{receipt.numbers.length > 1 ? 'Reçus n°' : 'Reçu n°'}</dt>
                                <dd className="text-right text-sm font-semibold text-ink-900">{receipt.numbers.join(', ')}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Élève</dt>
                                <dd className="text-sm font-semibold text-ink-900">{receipt.student}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Montant reçu</dt>
                                <dd className="text-sm font-semibold text-ink-900">{fcfa(receipt.total)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Date</dt>
                                <dd className="text-sm font-semibold text-ink-900">{longDate(receipt.paid_at)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Mode de paiement</dt>
                                <dd className="text-sm font-semibold text-ink-900">{receipt.channel}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-sm text-ink-500">Réglé</dt>
                                <dd className="text-right text-sm font-semibold text-ink-900">
                                    {receipt.invoices.map((label) => (
                                        <span key={label} className="block">
                                            {label}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                        </dl>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-soft">
                        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-600" aria-hidden="true" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Reçu non vérifiable</h2>
                        <p className="mt-2 text-sm text-ink-600">
                            Aucun reçu ne correspond à ce code de vérification. Le document présenté pourrait être invalide : rapprochez-vous du service de comptabilité de l'établissement.
                        </p>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href={route('home')} className="text-sm font-medium text-ink-500 hover:text-gold-600">
                        ← Retour à l'accueil
                    </Link>
                </div>
            </section>
        </PublicLayout>
    );
}

import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import { ReportCard } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, ShieldAlert } from 'lucide-react';

const decisionLabels: Record<string, string> = {
    admis: 'Admis(e) en classe supérieure',
    redouble: 'Autorisé(e) à redoubler',
    exclu: 'Exclusion',
    rattrapage: 'Rattrapage',
    non_defini: 'Non défini',
};

export default function BulletinVerification({ reportCard }: { reportCard: ReportCard | null }) {
    return (
        <PublicLayout>
            <Head title="Vérification de bulletin" />
            <PageHero
                eyebrow="Authentification"
                title="Vérification de bulletin"
                subtitle="Ce service permet de confirmer l'authenticité d'un bulletin délivré par l'EEHT de Thiès à partir de son QR code."
            />

            <section className="mx-auto max-w-2xl animate-fade-in-up px-4 py-16 sm:px-6 lg:px-8">
                {reportCard ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-soft">
                        <BadgeCheck className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Bulletin authentique</h2>
                        <p className="mt-2 text-sm text-ink-600">
                            Ce document a bien été délivré par l'Elite École Hôtelière et Touristique de Thiès.
                        </p>

                        <dl className="mt-8 space-y-3 rounded-xl bg-white p-6 text-left shadow-sm">
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Élève</dt>
                                <dd className="text-sm font-semibold text-ink-900">
                                    {reportCard.student?.first_name} {reportCard.student?.last_name}
                                </dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Matricule</dt>
                                <dd className="text-sm font-semibold text-ink-900">{reportCard.student?.matricule}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Classe</dt>
                                <dd className="text-sm font-semibold text-ink-900">{reportCard.school_class?.name}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Année académique</dt>
                                <dd className="text-sm font-semibold text-ink-900">{reportCard.academic_year?.label}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Période</dt>
                                <dd className="text-sm font-semibold text-ink-900">{reportCard.term}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Moyenne générale</dt>
                                <dd className="text-sm font-semibold text-ink-900">
                                    {reportCard.average != null ? Number(reportCard.average).toFixed(2) : '—'} / 20
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-sm text-ink-500">Décision</dt>
                                <dd className="text-sm font-semibold text-ink-900">
                                    {decisionLabels[reportCard.decision] ?? reportCard.decision}
                                </dd>
                            </div>
                        </dl>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-soft">
                        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-600" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Document non vérifiable</h2>
                        <p className="mt-2 text-sm text-ink-600">
                            Aucun bulletin publié ne correspond à ce code de vérification. Le document présenté pourrait
                            être invalide, ou n'a pas encore été publié par l'établissement.
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

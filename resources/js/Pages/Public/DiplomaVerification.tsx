import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, ShieldAlert } from 'lucide-react';

type VerifiedStudent = {
    first_name: string;
    last_name: string;
    matricule: string;
    diploma_number: string;
    diploma_issued_at: string | null;
    formation: { name: string; diploma: string | null; diploma_full_name: string | null; specialty: string | null } | null;
};

export default function DiplomaVerification({ student }: { student: VerifiedStudent | null }) {
    const formation = student?.formation;
    const formationLabel = formation
        ? `${formation.diploma_full_name ?? formation.name}${formation.diploma ? ` (${formation.diploma})` : ''}`
        : null;

    return (
        <PublicLayout>
            <Head title="Vérification de diplôme" />
            <PageHero
                eyebrow="Authentification"
                title="Vérification de diplôme"
                subtitle="Ce service permet de confirmer l'authenticité d'un diplôme délivré par l'EEHT de Thiès à partir de son QR code."
            />

            <section className="mx-auto max-w-2xl animate-fade-in-up px-4 py-16 sm:px-6 lg:px-8">
                {student ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-soft">
                        <BadgeCheck className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Diplôme authentique</h2>
                        <p className="mt-2 text-sm text-ink-600">
                            Ce document a bien été délivré par l'Elite École Hôtelière et Touristique de Thiès.
                        </p>

                        <dl className="mt-8 space-y-3 rounded-xl bg-white p-6 text-left shadow-sm">
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Titulaire</dt>
                                <dd className="text-sm font-semibold text-ink-900">
                                    {student.first_name} {student.last_name}
                                </dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Matricule</dt>
                                <dd className="text-sm font-semibold text-ink-900">{student.matricule}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Diplôme</dt>
                                <dd className="text-sm font-semibold text-ink-900">{formationLabel ?? '—'}</dd>
                            </div>
                            {formation?.specialty && formation.specialty !== formation.name && (
                                <div className="flex justify-between border-b border-ink-100 pb-3">
                                    <dt className="text-sm text-ink-500">Spécialité</dt>
                                    <dd className="text-sm font-semibold text-ink-900">{formation.specialty}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-b border-ink-100 pb-3">
                                <dt className="text-sm text-ink-500">Date de délivrance</dt>
                                <dd className="text-sm font-semibold text-ink-900">
                                    {student.diploma_issued_at ? new Date(student.diploma_issued_at).toLocaleDateString('fr-FR') : '—'}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-sm text-ink-500">N° de diplôme</dt>
                                <dd className="text-sm font-semibold text-ink-900">{student.diploma_number}</dd>
                            </div>
                        </dl>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-soft">
                        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-600" />
                        <h2 className="font-serif text-2xl font-bold text-ink-900">Document non vérifiable</h2>
                        <p className="mt-2 text-sm text-ink-600">
                            Aucun diplôme ne correspond à ce code de vérification. Le document présenté pourrait être
                            invalide.
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

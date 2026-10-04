import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { initials, storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Briefcase, GraduationCap, Linkedin } from 'lucide-react';

interface Alumnus {
    id: number;
    first_name: string;
    last_name: string;
    photo?: string | null;
    graduation_year?: number | null;
    current_position?: string | null;
    current_employer?: string | null;
    linkedin_url?: string | null;
    alumni_bio?: string | null;
    formation?: { id: number; name: string } | null;
}

export default function Index({ alumni }: { alumni: Alumnus[] }) {
    return (
        <PublicLayout>
            <Head title="Anciens élèves - EEHT de Thiès" />

            <PageHero
                eyebrow="Ils nous font confiance"
                title="Annuaire des anciens élèves"
                subtitle="Découvrez le parcours de nos diplômés, aujourd'hui en poste dans l'hôtellerie, la restauration et le tourisme."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    {alumni.length === 0 ? (
                        <p className="text-center text-ink-500">L'annuaire des anciens élèves sera bientôt disponible.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {alumni.map((alumnus, i) => {
                                const photo = storageUrl(alumnus.photo);
                                return (
                                    <Reveal key={alumnus.id} delay={(i % 6) * 70}>
                                    <div className="h-full rounded-2xl border border-ink-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                                                {photo ? (
                                                    <img src={photo} alt={`${alumnus.first_name} ${alumnus.last_name}`} loading="lazy" className="h-full w-full object-cover" />
                                                ) : (
                                                    <ImagePlaceholder className="h-full w-full rounded-full" label={initials(alumnus.first_name, alumnus.last_name)} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-base font-bold text-ink-900">
                                                    {alumnus.first_name} {alumnus.last_name}
                                                </h3>
                                                {alumnus.formation && (
                                                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-500">
                                                        <GraduationCap className="h-3.5 w-3.5 text-gold-600" />
                                                        {alumnus.formation.name}
                                                        {alumnus.graduation_year ? ` — ${alumnus.graduation_year}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {(alumnus.current_position || alumnus.current_employer) && (
                                            <p className="mt-4 inline-flex items-start gap-1.5 text-sm font-medium text-ink-700">
                                                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                                                {alumnus.current_position}
                                                {alumnus.current_employer ? ` — ${alumnus.current_employer}` : ''}
                                            </p>
                                        )}

                                        {alumnus.alumni_bio && <p className="mt-3 text-sm leading-relaxed text-ink-500">{alumnus.alumni_bio}</p>}

                                        {alumnus.linkedin_url && (
                                            <a
                                                href={alumnus.linkedin_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800"
                                            >
                                                <Linkedin className="h-3.5 w-3.5" /> Profil LinkedIn
                                            </a>
                                        )}
                                    </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

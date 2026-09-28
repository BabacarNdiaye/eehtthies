import PublicLayout from '@/Layouts/PublicLayout';
import PageHero from '@/Components/Public/PageHero';
import ImagePlaceholder from '@/Components/Public/ImagePlaceholder';
import Reveal from '@/Components/Public/Reveal';
import { Teacher } from '@/types';
import { initials, storageUrl } from '@/lib/publicFormat';
import { Head } from '@inertiajs/react';
import { Award, GraduationCap } from 'lucide-react';

export default function Teachers({ teachers }: { teachers: Teacher[] }) {
    return (
        <PublicLayout>
            <Head title="Notre équipe pédagogique - EEHT de Thiès" />

            <PageHero
                eyebrow="Excellence pédagogique"
                title="Notre équipe pédagogique"
                subtitle="Des enseignants expérimentés, issus des métiers de l'hôtellerie, de la restauration et du tourisme, engagés à transmettre leur savoir-faire à nos étudiants."
            />

            <section className="py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {teachers.length === 0 ? (
                        <p className="text-center text-ink-500">
                            La liste de nos enseignants sera bientôt
                            disponible.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {teachers.map((teacher, i) => {
                                const photo = storageUrl(teacher.photo);
                                return (
                                    <Reveal key={teacher.id} delay={(i % 6) * 70}>
                                    <div
                                        className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                                    >
                                        <div className="h-56 w-full overflow-hidden">
                                            {photo ? (
                                                <img
                                                    src={photo}
                                                    alt={`${teacher.first_name} ${teacher.last_name}`}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <ImagePlaceholder
                                                    className="h-full w-full"
                                                    label={initials(
                                                        teacher.first_name,
                                                        teacher.last_name,
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <h3 className="font-serif text-lg font-bold text-ink-900">
                                                {teacher.first_name}{' '}
                                                {teacher.last_name}
                                            </h3>
                                            {teacher.specialty && (
                                                <p className="mt-1 text-sm font-medium text-gold-600">
                                                    {teacher.specialty}
                                                </p>
                                            )}
                                            <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm text-ink-500">
                                                {!!teacher.experience_years && (
                                                    <div className="flex items-center gap-2">
                                                        <Award className="h-4 w-4 text-gold-500" />
                                                        {
                                                            teacher.experience_years
                                                        }{' '}
                                                        ans d'expérience
                                                    </div>
                                                )}
                                                {teacher.diplomas && (
                                                    <div className="flex items-start gap-2">
                                                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                                                        <span>
                                                            {teacher.diplomas}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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

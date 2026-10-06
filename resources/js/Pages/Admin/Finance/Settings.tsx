import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    settings: { due_day: number; remind_before_due: boolean; auto_generate_monthly: boolean };
}

export default function Settings({ settings }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        due_day: String(settings.due_day),
        remind_before_due: settings.remind_before_due,
        auto_generate_monthly: settings.auto_generate_monthly,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.finance.settings.update'), { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Réglages des paiements" />
            <PageHeader title="Réglages des paiements" subtitle="Comment les mensualités sont datées, relancées et encaissées." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Échéance des mensualités</h2>
                    <p className="mb-5 text-sm text-ink-500">
                        Une mensualité sans date d'échéance n'est jamais « en retard » : elle échappe aux relances. Les mensualités générées reçoivent donc
                        une échéance, ce jour-là de leur mois.
                    </p>
                    <div className="max-w-xs">
                        <Field
                            label="Jour du mois"
                            required
                            error={errors.due_day}
                            hint="De 1 à 28, pour que la date existe tous les mois (le 5 par défaut)."
                        >
                            <TextInput
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={28}
                                value={data.due_day}
                                onChange={(e) => setData('due_day', e.target.value)}
                            />
                        </Field>
                    </div>
                    <p className="mt-4 text-sm text-ink-500">
                        Ce réglage s'applique aux mensualités générées à partir de maintenant. Pour dater celles qui existent déjà, ouvrez le{' '}
                        <Link href={route('admin.invoices.monthly')} className="font-medium text-gold-700 hover:text-gold-600">
                            suivi des mensualités
                        </Link>
                        .
                    </p>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Relances des familles</h2>
                    <p className="mb-5 text-sm text-ink-500">
                        Une famille est relancée automatiquement à 3, 7, 15, 30 et 60 jours de retard, par e-mail, notification et message EEHT Connect, selon
                        ses contacts. Chaque envoi est consigné : un palier ne part jamais deux fois. Le personnel peut aussi relancer à la main depuis le
                        suivi des mensualités et la liste des impayés.
                    </p>
                    <label className="flex items-start gap-3">
                        <Checkbox
                            className="mt-0.5"
                            checked={data.remind_before_due}
                            onChange={(e) => setData('remind_before_due', e.target.checked)}
                        />
                        <span className="text-sm text-ink-700">
                            Prévenir aussi la famille 3 jours avant l'échéance
                            <span className="block text-xs text-ink-500">Désactivé par défaut. Un rappel court, sans montant sur l'écran verrouillé.</span>
                        </span>
                    </label>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Génération automatique des mensualités</h2>
                    <p className="mb-5 text-sm text-ink-500">
                        Le 1<sup>er</sup> de chaque mois à 6 h, la mensualité du mois est créée pour chaque élève actif : un dixième des frais de scolarité de sa
                        formation, échéance le {data.due_day || settings.due_day} du mois. Une mensualité déjà créée n'est jamais modifiée ni doublée, et rien
                        n'est généré de juillet à août.
                    </p>
                    <label className="flex items-start gap-3">
                        <Checkbox
                            className="mt-0.5"
                            checked={data.auto_generate_monthly}
                            onChange={(e) => setData('auto_generate_monthly', e.target.checked)}
                        />
                        <span className="text-sm text-ink-700">
                            Générer les mensualités chaque mois, automatiquement
                            <span className="block text-xs text-ink-500">Désactivé par défaut. Il faut une année académique en cours et des frais de scolarité sur la formation.</span>
                        </span>
                    </label>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        Enregistrer
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}

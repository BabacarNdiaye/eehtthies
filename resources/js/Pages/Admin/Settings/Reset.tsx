import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import { Head, Link, useForm } from '@inertiajs/react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';

interface Category {
    key: string;
    label: string;
    description: string;
    note: string | null;
    counts: Record<string, number>;
    count: number;
    includes: string[];
    restore: 'optional' | 'forced' | null;
}

interface Group {
    label: string;
    categories: Category[];
}

interface Props {
    groups: Group[];
    confirmationWord: string;
}

function plural(count: number, word: string): string {
    return `${count.toLocaleString('fr-FR')} ${word}${count > 1 ? 's' : ''}`;
}

/** Unité affichée à côté du nombre : réglages et comptes ne sont pas des « enregistrements » au sens strict. */
function unitOf(category: Category): string {
    const keys = Object.keys(category.counts);

    if (keys.some((key) => key.startsWith('settings:'))) return 'réglage';
    if (keys.includes('users:portail')) return 'compte';

    return 'enregistrement';
}

export default function Reset({ groups, confirmationWord }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        categories: [] as string[],
        restore: [] as string[],
        confirmation: '',
        password: '',
    });

    const byKey = useMemo(
        () => new Map(groups.flatMap((group) => group.categories).map((category) => [category.key, category])),
        [groups],
    );
    const labelOf = (key: string) => byKey.get(key)?.label ?? key;

    const selected = new Set(data.categories);

    // Dépendances entraînées par la sélection : cochées d'office, avec les catégories qui les exigent.
    const forcedBy = new Map<string, string[]>();
    data.categories.forEach((key) => {
        byKey.get(key)?.includes.forEach((included) => {
            forcedBy.set(included, [...(forcedBy.get(included) ?? []), key]);
        });
    });
    const effective = new Set([...data.categories, ...forcedBy.keys()]);

    // Nombre d'enregistrements concernés, sans compter deux fois une table partagée entre catégories.
    const rows = new Map<string, number>();
    effective.forEach((key) => {
        Object.entries(byKey.get(key)?.counts ?? {}).forEach(([table, count]) => rows.set(table, count));
    });
    const totalRows = [...rows.values()].reduce((sum, count) => sum + count, 0);

    const toggle = (key: string) =>
        setData('categories', selected.has(key) ? data.categories.filter((k) => k !== key) : [...data.categories, key]);

    const toggleGroup = (group: Group) => {
        const keys = group.categories.map((category) => category.key);
        const allSelected = keys.every((key) => selected.has(key));

        setData(
            'categories',
            allSelected ? data.categories.filter((key) => !keys.includes(key)) : [...new Set([...data.categories, ...keys])],
        );
    };

    const toggleRestore = (key: string) =>
        setData('restore', data.restore.includes(key) ? data.restore.filter((k) => k !== key) : [...data.restore, key]);

    const confirmed = data.confirmation.trim().toUpperCase() === confirmationWord;
    const canSubmit = effective.size > 0 && confirmed && data.password !== '' && !processing;
    const categoriesError = Object.entries(errors).find(([field]) => field === 'categories' || field.startsWith('categories.'))?.[1];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!canSubmit) return;

        post(route('admin.settings.reset.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onFinish: () => setData('password', ''),
        });
    };

    return (
        <AdminLayout>
            <Head title="Réinitialiser des données" />
            <PageHeader
                title="Réinitialiser des données"
                subtitle="Choisissez ce qui doit être remis à zéro : le reste n'est pas touché."
            >
                <Link
                    href={route('admin.settings.edit')}
                    className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                    Retour aux paramètres
                </Link>
            </PageHeader>

            <Card className="mb-6 border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="space-y-1.5 text-sm text-red-900">
                        <p className="font-semibold">Cette opération est définitive.</p>
                        <ul className="list-disc space-y-1 pl-5 text-red-800">
                            <li>
                                Une sauvegarde de la base de données est créée automatiquement juste avant la suppression ;
                                si elle échoue, rien n'est supprimé.
                            </li>
                            <li>
                                Les fichiers supprimés (photos, documents, logos…) ne sont pas dans cette sauvegarde : ils ne
                                se retrouvent que dans une sauvegarde complète.{' '}
                                <Link href={route('admin.backups.index')} className="font-semibold underline">
                                    Ouvrir la page Sauvegardes
                                </Link>
                            </li>
                            <li>Les comptes du personnel, les rôles et permissions et votre propre compte ne sont jamais supprimés.</li>
                        </ul>
                    </div>
                </div>
            </Card>

            <form onSubmit={submit}>
                {groups.map((group) => {
                    const allSelected = group.categories.every((category) => selected.has(category.key));

                    return (
                        <Card key={group.label} className="mb-6 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-5 py-3">
                                <h2 className="font-serif text-base font-bold text-ink-900">{group.label}</h2>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group)}
                                    className="text-xs font-semibold text-ink-600 transition-colors hover:text-ink-900"
                                >
                                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                                </button>
                            </div>

                            <ul className="divide-y divide-ink-100">
                                {group.categories.map((category) => {
                                    const parents = forcedBy.get(category.key);
                                    const isForced = parents !== undefined;
                                    const isEffective = effective.has(category.key);

                                    return (
                                        <li key={category.key} className={`px-5 py-3 transition-colors ${isEffective ? 'bg-red-50/60' : ''}`}>
                                            <label className={`flex items-start gap-3 ${isForced ? 'cursor-default' : 'cursor-pointer'}`}>
                                                <Checkbox
                                                    checked={isEffective}
                                                    disabled={isForced}
                                                    onChange={() => toggle(category.key)}
                                                    className="mt-1"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span className="text-sm font-semibold text-ink-900">{category.label}</span>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                category.count === 0 ? 'bg-ink-100 text-ink-600' : 'bg-ink-800 text-white'
                                                            }`}
                                                        >
                                                            {category.count === 0 ? 'Vide' : plural(category.count, unitOf(category))}
                                                        </span>
                                                        {isForced && (
                                                            <span className="text-xs font-medium text-red-700">
                                                                inclus automatiquement ({[...new Set(parents)].map(labelOf).join(', ')})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-ink-500">{category.description}</span>
                                                    {category.includes.length > 0 && (
                                                        <span className="mt-0.5 block text-xs text-ink-500">
                                                            Inclut aussi : {category.includes.map(labelOf).join(', ')}.
                                                        </span>
                                                    )}
                                                    {category.note && (
                                                        <span className="mt-0.5 block text-xs text-amber-700">{category.note}</span>
                                                    )}
                                                </span>
                                            </label>

                                            {isEffective && category.restore === 'optional' && (
                                                <label className="ml-7 mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-700">
                                                    <Checkbox
                                                        checked={data.restore.includes(category.key)}
                                                        onChange={() => toggleRestore(category.key)}
                                                    />
                                                    Recharger le contenu d'origine après la suppression
                                                </label>
                                            )}
                                            {isEffective && category.restore === 'forced' && (
                                                <p className="ml-7 mt-2 text-xs text-ink-600">
                                                    Les journaux et comptes par défaut sont rechargés automatiquement.
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    );
                })}

                <Card className="z-10 border-red-300 p-5 shadow-elevated lg:sticky lg:bottom-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1" aria-live="polite">
                            <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                                <TriangleAlert className="h-4 w-4 shrink-0" />
                                {effective.size === 0
                                    ? 'Aucune catégorie sélectionnée'
                                    : `${plural(effective.size, 'catégorie')} · ${plural(totalRows, 'enregistrement')} à supprimer`}
                            </p>
                            {effective.size > 0 && (
                                <p className="mt-1 truncate text-xs text-ink-600" title={[...effective].map(labelOf).join(', ')}>
                                    {[...effective].map(labelOf).join(', ')}
                                </p>
                            )}
                            {categoriesError && <p className="mt-1 text-xs text-red-600">{categoriesError}</p>}
                        </div>

                        <div className="lg:w-64">
                            <Field label={`Tapez ${confirmationWord} pour confirmer`} error={errors.confirmation}>
                                <TextInput
                                    value={data.confirmation}
                                    onChange={(event) => setData('confirmation', event.target.value)}
                                    autoComplete="off"
                                    placeholder={confirmationWord}
                                />
                            </Field>
                        </div>
                        <div className="lg:w-56">
                            <Field label="Votre mot de passe" error={errors.password}>
                                <TextInput
                                    type="password"
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                    autoComplete="current-password"
                                />
                            </Field>
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <RotateCcw className="h-4 w-4" />
                            {processing ? 'Réinitialisation en cours (patientez)…' : 'Réinitialiser'}
                        </button>
                    </div>
                </Card>
            </form>
        </AdminLayout>
    );
}

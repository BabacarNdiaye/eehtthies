import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { IconAnchor, IconButton } from '@/Components/Admin/IconButton';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Download, HardDrive, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

interface BackupRow {
    disk: string;
    path: string;
    name: string;
    date: string;
    size: number;
}

interface Props {
    backups: BackupRow[];
    healthy: boolean;
    error: string | null;
    totalSize: number;
}

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function formatDate(value: string): string {
    return new Date(value.replace(' ', 'T')).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Index({ backups, healthy, error, totalSize }: Props) {
    const [creating, setCreating] = useState(false);

    const createBackup = () => {
        setCreating(true);
        router.post(
            route('admin.backups.store'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setCreating(false),
            },
        );
    };

    const destroy = (backup: BackupRow) => {
        if (confirm(`Supprimer la sauvegarde "${backup.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.backups.destroy', { disk: backup.disk, path: backup.path }), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Sauvegardes" />
            <PageHeader
                title="Sauvegardes"
                subtitle="Sauvegarde automatique quotidienne de la base de données et des fichiers (photos, documents, logos)."
            />

            <Card className="mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    {healthy ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                        <TriangleAlert className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                        <p className="text-sm font-semibold text-ink-900">
                            {healthy ? 'Les sauvegardes sont à jour' : 'Problème détecté avec les sauvegardes'}
                        </p>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                        <p className="text-xs text-ink-500">
                            {backups.length} sauvegarde(s) · {formatSize(totalSize)} au total
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={createBackup}
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink-800 disabled:opacity-50"
                >
                    <HardDrive className="h-4 w-4" />
                    {creating ? 'Création en cours (patientez)...' : 'Créer une sauvegarde maintenant'}
                </button>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Fichier</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Taille</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {backups.map((backup) => (
                                <tr key={backup.path} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-mono text-xs text-ink-700">{backup.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{formatDate(backup.date)}</td>
                                    <td className="px-5 py-3 text-ink-600">{formatSize(backup.size)}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconAnchor
                                                href={route('admin.backups.download', { disk: backup.disk, path: backup.path })}
                                                label="Télécharger"
                                            >
                                                <Download className="h-4 w-4" />
                                            </IconAnchor>
                                            <IconButton
                                                onClick={() => destroy(backup)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {backups.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <HardDrive className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune sauvegarde pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <p className="mt-4 text-xs text-ink-500">
                Une sauvegarde automatique est créée chaque nuit à 2h. Pensez à télécharger régulièrement une copie sur un
                autre appareil : ces sauvegardes sont stockées sur le même serveur que le site.
            </p>
        </AdminLayout>
    );
}

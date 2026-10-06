import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';

interface Props {
    title: string;
    columns: string;
    postRoute: string;
    templateRoute: string;
}

export default function CsvImport({ title, columns, postRoute, templateRoute }: Props) {
    const [show, setShow] = useState(false);
    const form = useForm({ file: null as File | null });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(postRoute, {
            forceFormData: true,
            onSuccess: () => {
                setShow(false);
                form.reset();
            },
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setShow(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition-colors duration-150 hover:bg-ink-50 active:scale-[0.98]"
            >
                <Upload className="h-4 w-4" />
                Importer
            </button>

            <Modal show={show} onClose={() => setShow(false)} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">{title}</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Fichier CSV (séparateur « , » ou « ; ») avec les colonnes {columns}.{' '}
                        <a href={templateRoute} className="text-brand-600 underline">
                            Télécharger le modèle
                        </a>
                        .
                    </p>
                    <input
                        type="file"
                        aria-label="Fichier CSV"
                        accept=".csv,text/csv"
                        onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                    />
                    {form.errors.file && <p className="mt-2 text-xs text-red-600">{form.errors.file}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShow(false)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.file}
                            className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink-800 disabled:opacity-50"
                        >
                            {form.processing ? 'Importation…' : 'Importer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

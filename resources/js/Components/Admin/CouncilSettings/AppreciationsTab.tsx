import Card from '@/Components/Admin/Card';
import { Field, Select, Textarea } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

interface Template {
    id: number;
    level: string;
    theme: string;
    text: string;
    is_active: boolean;
}

interface Props {
    templates: Template[];
    levels: Record<string, string>;
    themes: Record<string, string>;
    canEdit: boolean;
}

const keep = { preserveScroll: true, preserveState: true } as const;

/** Banque d'appréciations (PAR-06) : phrases types par niveau et par thème. */
export default function AppreciationsTab({ templates, levels, themes, canEdit }: Props) {
    const form = useForm({ level: Object.keys(levels)[0], theme: Object.keys(themes)[0], text: '' });

    const toggle = (template: Template) => router.patch(route('admin.council-settings.appreciations.update', template.id), { ...template, is_active: !template.is_active }, keep);
    const destroy = async (template: Template) => {
        if (await confirmAction('Supprimer cette phrase de la banque ? Les appréciations déjà saisies ne changent pas.')) {
            router.delete(route('admin.council-settings.appreciations.destroy', template.id), keep);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {canEdit && (
                <Card className="p-5 lg:col-span-1">
                    <h2 className="mb-3 font-serif text-base font-bold text-ink-900">Nouvelle phrase</h2>
                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(route('admin.council-settings.appreciations.store'), { ...keep, onSuccess: () => form.reset('text') });
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Niveau" error={form.errors.level}>
                                <Select value={form.data.level} onChange={(e) => form.setData('level', e.target.value)}>
                                    {Object.entries(levels).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Thème" error={form.errors.theme}>
                                <Select value={form.data.theme} onChange={(e) => form.setData('theme', e.target.value)}>
                                    {Object.entries(themes).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field label="Phrase" required error={form.errors.text}>
                            <Textarea rows={3} value={form.data.text} onChange={(e) => form.setData('text', e.target.value)} />
                        </Field>
                        <button type="submit" disabled={form.processing} className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Ajouter à la banque
                        </button>
                    </form>
                </Card>
            )}
            <Card className={`overflow-hidden ${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <ul className="divide-y divide-ink-100">
                    {templates.map((template) => (
                        <li key={template.id} className="flex items-start gap-3 px-5 py-3">
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm ${template.is_active ? 'text-ink-900' : 'text-ink-400 line-through'}`}>{template.text}</p>
                                <p className="text-xs text-ink-500">
                                    {levels[template.level]} · {themes[template.theme]}
                                    {!template.is_active && ' · inactive'}
                                </p>
                            </div>
                            {canEdit && (
                                <>
                                    <button type="button" onClick={() => toggle(template)} className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                                        {template.is_active ? 'Désactiver' : 'Activer'}
                                    </button>
                                    <IconButton label="Supprimer la phrase" tone="danger" onClick={() => destroy(template)}>
                                        <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                </>
                            )}
                        </li>
                    ))}
                    {templates.length === 0 && <li className="px-5 py-6 text-sm text-ink-500">La banque est vide.</li>}
                </ul>
            </Card>
        </div>
    );
}

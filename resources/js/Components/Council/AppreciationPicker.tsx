import Drawer from '@/Components/Admin/Drawer';
import { Select } from '@/Components/Admin/Field';
import { BookOpenText } from 'lucide-react';
import { useState } from 'react';

export interface BankEntry {
    id: number;
    level: string;
    theme: string;
    text: string;
}

interface Props {
    bank: BankEntry[];
    levels: Record<string, string>;
    themes: Record<string, string>;
    onPick: (text: string) => void;
    disabled?: boolean;
    /** Nom accessible du bouton (« Banque d'appréciations pour Awa Diop »). */
    label?: string;
}

/** Banque d'appréciations (PRE-02, DEC-03) : la phrase choisie est insérée, puis reste modifiable. */
export default function AppreciationPicker({ bank, levels, themes, onPick, disabled = false, label = 'Banque d’appréciations' }: Props) {
    const [open, setOpen] = useState(false);
    const [level, setLevel] = useState('');
    const [theme, setTheme] = useState('');
    const shown = bank.filter((entry) => (!level || entry.level === level) && (!theme || entry.theme === theme));

    return (
        <>
            <button
                type="button"
                disabled={disabled || bank.length === 0}
                onClick={() => setOpen(true)}
                aria-label={label}
                title={label}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-40"
            >
                <BookOpenText className="h-4 w-4" aria-hidden="true" />
                Banque
            </button>
            <Drawer open={open} onClose={() => setOpen(false)} title="Banque d’appréciations" subtitle="La phrase choisie s’insère et reste modifiable.">
                <div className="mb-4 grid grid-cols-2 gap-2">
                    <Select aria-label="Niveau" value={level} onChange={(e) => setLevel(e.target.value)}>
                        <option value="">Tous les niveaux</option>
                        {Object.entries(levels).map(([key, name]) => (
                            <option key={key} value={key}>
                                {name}
                            </option>
                        ))}
                    </Select>
                    <Select aria-label="Thème" value={theme} onChange={(e) => setTheme(e.target.value)}>
                        <option value="">Tous les thèmes</option>
                        {Object.entries(themes).map(([key, name]) => (
                            <option key={key} value={key}>
                                {name}
                            </option>
                        ))}
                    </Select>
                </div>
                <ul className="space-y-2">
                    {shown.map((entry) => (
                        <li key={entry.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onPick(entry.text);
                                    setOpen(false);
                                }}
                                className="w-full rounded-lg border border-ink-100 p-3 text-left text-sm text-ink-800 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <span className="mb-1 block text-xs text-ink-500">
                                    {levels[entry.level]} · {themes[entry.theme]}
                                </span>
                                {entry.text}
                            </button>
                        </li>
                    ))}
                    {shown.length === 0 && <li className="text-sm text-ink-500">Aucune phrase pour ces critères.</li>}
                </ul>
            </Drawer>
        </>
    );
}

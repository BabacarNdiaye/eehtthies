import { Select, TextInput } from '@/Components/Admin/Field';
import { fcfa } from '@/lib/money';
import { Plus, Trash2 } from 'lucide-react';

export interface EditorProduct {
    id: number;
    name: string;
    unit: string;
    unit_cost?: string | number;
    quantity_in_stock?: string | number;
    min_threshold?: string | number;
}

export interface EditorLine {
    product_id: number | '';
    quantity: number | '';
    unit_cost?: number | '';
}

/**
 * Tableau de saisie des lignes d'un bon de commande (avec prix) ou d'une demande de matériel (sans prix). Le prix
 * se propose à partir du coût moyen de l'article ; le stock actuel est rappelé à côté de chaque article.
 */
export default function LinesEditor({
    products,
    lines,
    onChange,
    withCost = false,
    errors = {},
}: {
    products: EditorProduct[];
    lines: EditorLine[];
    onChange: (lines: EditorLine[]) => void;
    withCost?: boolean;
    errors?: Record<string, string>;
}) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const update = (index: number, patch: Partial<EditorLine>) => onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    const pick = (index: number, value: string) => {
        const product = byId.get(Number(value));

        update(index, { product_id: value ? Number(value) : '', ...(withCost && product ? { unit_cost: Number(product.unit_cost ?? 0) } : {}) });
    };
    const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);

    return (
        <div>
            <div className="overflow-x-auto rounded-xl border border-ink-100">
                <table className="w-full text-left text-sm">
                    <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                        <tr>
                            <th className="px-3 py-2.5">Article</th>
                            <th className="w-32 px-3 py-2.5">Quantité</th>
                            {withCost && <th className="w-36 px-3 py-2.5">Prix unitaire</th>}
                            {withCost && <th className="w-36 px-3 py-2.5 text-right">Montant</th>}
                            <th className="w-12 px-3 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {lines.map((line, index) => {
                            const product = line.product_id ? byId.get(Number(line.product_id)) : undefined;

                            return (
                                <tr key={index} className="align-top">
                                    <td className="px-3 py-2.5">
                                        <Select aria-label="Article" value={line.product_id} onChange={(e) => pick(index, e.target.value)}>
                                            <option value="">Choisir un article…</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </Select>
                                        {product && product.quantity_in_stock !== undefined && (
                                            <p className="mt-1 text-xs text-ink-500">
                                                En stock : {Number(product.quantity_in_stock)} {product.unit}
                                            </p>
                                        )}
                                        {errors[`lines.${index}.product_id`] && <p className="mt-1 text-xs font-medium text-red-600">{errors[`lines.${index}.product_id`]}</p>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <TextInput aria-label="Quantité" type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => update(index, { quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
                                            <span className="text-xs text-ink-500">{product?.unit}</span>
                                        </div>
                                        {errors[`lines.${index}.quantity`] && <p className="mt-1 text-xs font-medium text-red-600">{errors[`lines.${index}.quantity`]}</p>}
                                    </td>
                                    {withCost && (
                                        <td className="px-3 py-2.5">
                                            <TextInput aria-label="Prix unitaire" type="number" min="0" step="1" value={line.unit_cost ?? ''} onChange={(e) => update(index, { unit_cost: e.target.value === '' ? '' : Number(e.target.value) })} />
                                        </td>
                                    )}
                                    {withCost && <td className="px-3 py-2.5 pt-4 text-right font-semibold tabular-nums text-ink-900">{fcfa((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0))}</td>}
                                    <td className="px-3 py-2.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onChange(lines.filter((_, i) => i !== index))}
                                            disabled={lines.length === 1}
                                            aria-label="Retirer cette ligne"
                                            className="rounded-lg p-2 text-ink-400 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-30"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => onChange([...lines, { product_id: '', quantity: '', ...(withCost ? { unit_cost: '' as const } : {}) }])}
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un article
                </button>
                {withCost && (
                    <p className="text-sm text-ink-500">
                        Total du bon : <strong className="text-lg tabular-nums text-ink-900">{fcfa(total)}</strong>
                    </p>
                )}
            </div>
            {errors.lines && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{errors.lines}</p>}
        </div>
    );
}

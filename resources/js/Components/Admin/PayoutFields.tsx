import { Field, Select, TextInput } from '@/Components/Admin/Field';

interface Props {
    channel: string;
    account: string;
    options: Record<string, string>;
    errors?: { payout_channel?: string; payout_account?: string };
    onChange: (field: 'payout_channel' | 'payout_account', value: string) => void;
}

/**
 * Mode de versement et numéro de compte (Wave, Orange Money, IBAN…) d'une personne rémunérée. Ces deux champs ne sont
 * proposés qu'à ceux qui peuvent modifier les salaires : le serveur ne les envoie pas aux autres.
 */
export default function PayoutFields({ channel, account, options, errors, onChange }: Props) {
    return (
        <>
            <Field label="Mode de versement du salaire" error={errors?.payout_channel} hint="Proposé à chaque paie et repris dans l'ordre de paiement.">
                <Select value={channel} onChange={(e) => onChange('payout_channel', e.target.value)}>
                    <option value="">À choisir au moment du paiement</option>
                    {Object.entries(options).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Field>
            <Field
                label="Numéro de compte ou de téléphone"
                error={errors?.payout_account}
                hint="Numéro Wave ou Orange Money, IBAN… Jamais envoyé par e-mail ni par notification, et masqué sur les bulletins."
            >
                <TextInput value={account} onChange={(e) => onChange('payout_account', e.target.value)} maxLength={120} autoComplete="off" />
            </Field>
        </>
    );
}

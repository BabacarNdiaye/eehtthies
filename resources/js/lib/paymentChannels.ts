/**
 * Libellés des modes de paiement lisibles en base : les canaux du guichet et les anciennes familles (« mobile_money »).
 * Miroir de App\Support\PaymentChannels::labels() : les écrans d'administration reçoivent leurs libellés du serveur,
 * les espaces élève et parent (qui ne reçoivent que les paiements) les lisent ici.
 */
export const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
    especes: 'Espèces',
    virement: 'Virement bancaire',
    wave: 'Wave',
    orange_money: 'Orange Money',
    free_money: 'Free Money',
    cheque: 'Chèque',
    carte: 'Carte bancaire',
    autre: 'Autre',
    mobile_money: 'Mobile Money',
};

/** Mode d'un paiement : son canal s'il en a un, sinon sa famille (anciens paiements). */
export function paymentChannelLabel(channel?: string | null, method?: string | null): string {
    const key = channel || method;

    return key ? (PAYMENT_CHANNEL_LABELS[key] ?? key) : '—';
}

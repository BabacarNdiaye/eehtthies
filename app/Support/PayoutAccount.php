<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/** Numéro de compte de versement (téléphone Wave, IBAN…) : donnée sensible, montrée masquée partout où elle n'est pas indispensable. */
final class PayoutAccount
{
    /** Le mode et le compte de versement ne se voient et ne se modifient qu'avec la permission de modifier les salaires. */
    public static function canManage(?User $user): bool
    {
        return $user?->can('modifier_salaires') ?? false;
    }

    /** @return array<string, list<mixed>> règles à ajouter à celles de la fiche, pour qui peut gérer ces données */
    public static function rules(): array
    {
        return [
            'payout_channel' => ['nullable', Rule::in(array_keys(PaymentChannels::payoutOptions()))],
            'payout_account' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * Ce que le formulaire d'une fiche reçoit : le mode, le compte en clair (pour le corriger) et les modes possibles.
     * Ces champs sont masqués à la sérialisation des modèles : ils ne sortent que par ici.
     *
     * @return array{channel: ?string, account: ?string, options: array<string, string>}
     */
    public static function formValues(?Model $payee = null): array
    {
        return [
            'channel' => $payee?->payout_channel,
            'account' => $payee?->payout_account,
            'options' => PaymentChannels::payoutOptions(),
        ];
    }

    /** « •••• 4567 » : les quatre derniers caractères (lettres ou chiffres), le reste masqué ; null quand il n'y a rien à montrer. */
    public static function mask(?string $account): ?string
    {
        $significant = preg_replace('/[^[:alnum:]]/u', '', (string) $account);

        if ($significant === '') {
            return null;
        }

        return mb_strlen($significant) <= 4 ? '••••' : '•••• '.mb_substr($significant, -4);
    }
}

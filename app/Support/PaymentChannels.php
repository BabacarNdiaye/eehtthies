<?php

namespace App\Support;

/**
 * Canaux d'encaissement et de versement proposés au guichet et dans la paie. Le « canal » (Wave, Orange Money,
 * chèque…) est ce que choisit l'opérateur ; la « famille » est l'ancienne valeur `method` de la base (enum : espèces,
 * virement, mobile money, autre), qui ne change pas et pilote le compte comptable (caisse ou banque).
 */
final class PaymentChannels
{
    /** @var array<string, array{label: string, method: string}> */
    private const CHANNELS = [
        'especes' => ['label' => 'Espèces', 'method' => 'especes'],
        'virement' => ['label' => 'Virement bancaire', 'method' => 'virement'],
        'wave' => ['label' => 'Wave', 'method' => 'mobile_money'],
        'orange_money' => ['label' => 'Orange Money', 'method' => 'mobile_money'],
        'free_money' => ['label' => 'Free Money', 'method' => 'mobile_money'],
        'cheque' => ['label' => 'Chèque', 'method' => 'autre'],
        'carte' => ['label' => 'Carte bancaire', 'method' => 'autre'],
        'autre' => ['label' => 'Autre', 'method' => 'autre'],
    ];

    /** Familles de l'enum d'origine qui ne sont pas des canaux : toujours acceptées et lisibles, plus proposées. */
    private const LEGACY = ['mobile_money' => 'Mobile Money'];

    /** @return array<string, string> canal => libellé, dans l'ordre d'affichage du guichet */
    public static function options(): array
    {
        return array_map(fn (array $channel) => $channel['label'], self::CHANNELS);
    }

    /** @return array<string, string> canaux possibles pour verser un salaire : les mêmes qu'au guichet, sans la carte bancaire */
    public static function payoutOptions(): array
    {
        return array_diff_key(self::options(), ['carte' => true]);
    }

    public static function isPayout(?string $value): bool
    {
        return $value !== null && array_key_exists($value, self::payoutOptions());
    }

    /** @return array<string, string> libellés de tout ce qui peut être lu en base : canaux et anciennes familles */
    public static function labels(): array
    {
        return self::options() + self::LEGACY;
    }

    /** Canaux et anciennes familles qu'on accepte en saisie (les anciens formulaires envoient encore « mobile_money »). */
    public static function acceptedKeys(): array
    {
        return [...array_keys(self::CHANNELS), ...array_keys(self::LEGACY)];
    }

    public static function isAccepted(?string $value): bool
    {
        return $value !== null && $value !== '' && (isset(self::CHANNELS[$value]) || isset(self::LEGACY[$value]));
    }

    /** Valeur de l'enum `method` pour un canal (ou une ancienne famille). */
    public static function methodFor(string $value): string
    {
        return self::CHANNELS[$value]['method'] ?? (isset(self::LEGACY[$value]) ? $value : 'autre');
    }

    /** Canal à enregistrer dans `channel` : null pour une ancienne famille qui n'est pas un vrai canal. */
    public static function channelFor(string $value): ?string
    {
        return isset(self::CHANNELS[$value]) ? $value : null;
    }

    public static function label(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return self::CHANNELS[$value]['label'] ?? self::LEGACY[$value] ?? $value;
    }

    /** Libellé d'un paiement : son canal s'il en a un, sinon sa famille. */
    public static function labelFor(?string $channel, ?string $method): string
    {
        return self::label($channel ?: $method);
    }
}

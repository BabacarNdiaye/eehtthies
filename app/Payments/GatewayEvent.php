<?php

namespace App\Payments;

/**
 * Ce que dit le fournisseur d'une tentative, une fois sa notification authentifiée : la référence de NOTRE tentative,
 * où elle en est, la somme qu'il dit avoir reçue (comparée à celle attendue avant tout encaissement), sa propre référence
 * et le canal réellement utilisé.
 */
final class GatewayEvent
{
    public const SUCCEEDED = 'succeeded';

    public const FAILED = 'failed';

    public const PENDING = 'pending';

    public const STATUSES = [self::SUCCEEDED, self::FAILED, self::PENDING];

    public function __construct(
        public readonly string $reference,
        public readonly string $status,
        public readonly float $amount,
        public readonly ?string $providerReference = null,
        public readonly ?string $channel = null,
    ) {}
}

<?php

namespace App\Payments;

use RuntimeException;

/** Une notification de fournisseur qu'on refuse de lire : signature fausse (401) ou contenu illisible (422). */
class InvalidWebhook extends RuntimeException
{
    public static function badSignature(): self
    {
        return new self('Signature invalide.', 401);
    }

    public static function malformed(string $reason = 'Contenu illisible.'): self
    {
        return new self($reason, 422);
    }
}

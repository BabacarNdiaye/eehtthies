<?php

namespace App\Support;

use App\Exceptions\CouncilException;
use App\Models\Council;

/**
 * Verrou du conseil de classe (RG-17, RG-18). Une fois le conseil clôturé, plus rien ne s'écrit : les modèles du conseil
 * appellent assertWritable() avant tout enregistrement ou suppression, si bien qu'un appel direct, hors des contrôleurs,
 * est refusé lui aussi. Seule la rectification de la Direction passe, à l'intérieur de rectifying().
 */
final class CouncilLock
{
    private static int $bypass = 0;

    public static function bypassing(): bool
    {
        return self::$bypass > 0;
    }

    /**
     * Exécute une rectification : les écritures sur un conseil clôturé y sont permises. À n'appeler que depuis le service
     * de rectification, après contrôle des droits de la Direction et du motif.
     */
    public static function rectifying(callable $callback): mixed
    {
        self::$bypass++;

        try {
            return $callback();
        } finally {
            self::$bypass--;
        }
    }

    public static function assertWritable(Council|string|null $council): void
    {
        $status = $council instanceof Council ? $council->getOriginal('status', $council->status) : $council;

        if ($status === Council::CLOSED && ! self::bypassing()) {
            throw CouncilException::locked();
        }
    }

    /** Le conseil doit être dans l'un de ces états pour l'action demandée. */
    public static function assertStatus(Council $council, string ...$statuses): void
    {
        self::assertWritable($council);

        if (! in_array($council->status, $statuses, true)) {
            $expected = implode(' ou ', array_map(fn (string $status) => '« '.Council::STATUSES[$status].' »', $statuses));

            throw CouncilException::rule('COUNCIL_WRONG_STATUS', "Action impossible : le conseil est « {$council->status_label} », il doit être {$expected}.");
        }
    }
}

<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Refus d'une règle du conseil de classe. Deux familles :
 *  - locked() : le conseil est clôturé, toute écriture est refusée (RG-18) → HTTP 423 ;
 *  - rule()   : une règle de gestion n'est pas respectée (décisions incompatibles, transition impossible…) → HTTP 422,
 *               avec un code stable (DECISION_INCOMPATIBLE…) que l'interface peut lire.
 *
 * Une requête JSON (autosave de la séance) reçoit le statut et le code ; une page Inertia revient en arrière avec le
 * message en bandeau d'erreur.
 */
class CouncilException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode, public readonly int $status)
    {
        parent::__construct($message);
    }

    public static function locked(): self
    {
        return new self('Ce conseil est clôturé : il ne peut plus être modifié, sauf par une rectification de la Direction.', 'COUNCIL_LOCKED', 423);
    }

    public static function rule(string $code, string $message): self
    {
        return new self($message, $code, 422);
    }

    public function render(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], $this->status);
        }

        return back()->with('error', $this->getMessage());
    }
}

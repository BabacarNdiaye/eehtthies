<?php

namespace App\Payments;

/**
 * Choisit le pilote de paiement en ligne actif d'après config/payments.php. Rien n'est actif par défaut (« none »), un
 * pilote inconnu reste inactif avec une explication, et la simulation est refusée en production tant que
 * PAYMENTS_ALLOW_SIMULATION n'est pas explicitement activé : un faux fournisseur ne doit jamais encaisser pour de vrai.
 */
class PaymentGateways
{
    private bool $resolved = false;

    private ?PaymentGateway $active = null;

    private ?string $refusal = null;

    /** Le pilote demandé par la configuration (« none » quand rien n'est configuré), qu'il soit actif ou refusé. */
    public function name(): string
    {
        return (string) (config('payments.driver') ?: 'none');
    }

    public function active(): ?PaymentGateway
    {
        $this->resolve();

        return $this->active;
    }

    /** Pourquoi le pilote demandé n'est pas actif (inconnu, simulation en production) ; null s'il est actif ou si rien n'est demandé. */
    public function refusal(): ?string
    {
        $this->resolve();

        return $this->refusal;
    }

    /** Le pilote portant ce nom, seulement s'il est le pilote actif : une notification d'un autre pilote est refusée. */
    public function find(string $name): ?PaymentGateway
    {
        $active = $this->active();

        return $active && $active->name() === $name ? $active : null;
    }

    private function resolve(): void
    {
        if ($this->resolved) {
            return;
        }

        $this->resolved = true;
        $name = $this->name();

        if ($name === 'none') {
            return;
        }

        $driver = config("payments.drivers.{$name}");

        if (! is_array($driver) || ! class_exists((string) ($driver['class'] ?? ''))) {
            $this->refusal = "Le pilote de paiement « {$name} » est inconnu : vérifiez PAYMENTS_DRIVER et config/payments.php.";

            return;
        }

        if ($name === 'simulation' && app()->isProduction() && ! config('payments.allow_simulation')) {
            $this->refusal = "La simulation est refusée en production : aucun paiement en ligne n'est actif. Choisissez un vrai pilote, ou autorisez-la explicitement avec PAYMENTS_ALLOW_SIMULATION=true.";

            return;
        }

        $this->active = app()->make($driver['class'], ['config' => $driver]);
    }
}

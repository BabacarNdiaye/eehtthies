<?php

namespace App\Services\Ai;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\RateLimitException;

/**
 * Appel à Claude (SDK PHP officiel d'Anthropic) renvoyant une réponse JSON
 * conforme au schéma demandé (sorties structurées).
 */
class ClaudeClient
{
    public function enabled(): bool
    {
        return filled(config('services.anthropic.key'));
    }

    /**
     * @param  array<string, mixed>  $schema  schéma JSON de la réponse attendue
     * @return array<string, mixed>
     *
     * @throws AssistantUnavailable
     */
    public function json(string $system, string $prompt, array $schema, int $maxTokens = 4000): array
    {
        if (! $this->enabled()) {
            throw new AssistantUnavailable("L'assistant IA n'est pas configuré (clé ANTHROPIC_API_KEY absente).");
        }

        $client = new Client(apiKey: config('services.anthropic.key'));

        try {
            $message = $client->beta->messages->create(
                maxTokens: $maxTokens,
                messages: [['role' => 'user', 'content' => $prompt]],
                model: config('services.anthropic.model'),
                system: $system,
                outputConfig: [
                    'effort' => config('services.anthropic.effort'),
                    'format' => ['type' => 'json_schema', 'schema' => $schema],
                ],
                // Si le modèle décline pour raison de sécurité, l'API retente
                // automatiquement sur un modèle de repli.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (AuthenticationException) {
            throw new AssistantUnavailable('La clé API Anthropic est invalide : vérifiez ANTHROPIC_API_KEY.');
        } catch (RateLimitException) {
            throw new AssistantUnavailable("L'assistant est très sollicité, réessayez dans un instant.");
        } catch (APIConnectionException) {
            throw new AssistantUnavailable("L'assistant est injoignable pour le moment.");
        } catch (APIStatusException $e) {
            report($e);
            throw new AssistantUnavailable("L'assistant n'a pas pu répondre.");
        }

        if ($message->stopReason === 'refusal') {
            throw new AssistantUnavailable("L'assistant ne peut pas traiter cette demande.");
        }

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $data = json_decode($block->text, true);
                if (is_array($data)) {
                    return $data;
                }
            }
        }

        throw new AssistantUnavailable("La réponse de l'assistant est incomplète.");
    }
}

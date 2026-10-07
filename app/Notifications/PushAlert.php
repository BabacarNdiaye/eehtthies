<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class PushAlert extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $body,
        private readonly string $url = '/',
        private readonly array $extra = [],
    ) {}

    /**
     * Rubriques de notification : bouton principal et vibration. Style sobre, sans illustration : le titre, une ligne
     * d'information et un seul bouton. La rubrique se déduit de l'adresse ouverte au clic.
     */
    private const CATEGORIES = [
        'finance' => ['action' => 'Consulter', 'vibrate' => [120, 60, 120]],
        'resultats' => ['action' => 'Consulter', 'vibrate' => [120, 60, 120]],
        'conseil' => ['action' => 'Consulter', 'vibrate' => [120, 60, 120]],
        'rh' => ['action' => 'Consulter', 'vibrate' => [120, 60, 120]],
        'messages' => ['action' => 'Répondre', 'vibrate' => [80, 40, 80]],
        'general' => ['action' => 'Ouvrir', 'vibrate' => [120, 60, 120]],
    ];

    private function category(): string
    {
        $key = $this->extra['category'] ?? null;
        if (is_string($key) && isset(self::CATEGORIES[$key])) {
            return $key;
        }

        $url = mb_strtolower($this->url);

        return match (true) {
            str_contains($url, 'facture'), str_contains($url, 'paiement'), str_contains($url, 'caisse') => 'finance',
            str_contains($url, 'note'), str_contains($url, 'bulletin') => 'resultats',
            str_contains($url, 'conseil') => 'conseil',
            str_contains($url, 'conges'), str_contains($url, 'ma-paie'), str_contains($url, '/rh') => 'rh',
            str_contains($url, 'connect') => 'messages',
            default => 'general',
        };
    }

    public function via($notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        $category = self::CATEGORIES[$this->category()];

        $message = (new WebPushMessage)
            ->title(Str::limit(trim($this->title), 60, '…'))
            ->icon('/icons/icon-192.png')
            // Petite pastille monochrome de la barre d'état Android (une icône en couleur y devient un carré gris).
            ->badge('/icons/badge-96.png')
            ->lang('fr')
            ->body(Str::limit(trim(preg_replace('/\s+/u', ' ', $this->body)), 140, '…'))
            ->vibrate($category['vibrate'])
            ->data(['url' => $this->url, 'sent_at' => now()->getTimestampMs()] + ($this->extra['data'] ?? []));

        // Image facultative, uniquement si l'appelant en fournit une (aucune par défaut : sobriété).
        if (isset($this->extra['image'])) {
            $message->image($this->extra['image']);
        }

        // Options facultatives (appels : sonnerie persistante, boutons, priorité haute).
        if (isset($this->extra['tag'])) {
            $message->tag($this->extra['tag'])->renotify();
        }
        if (! empty($this->extra['require_interaction'])) {
            $message->requireInteraction();
        }
        if (isset($this->extra['vibrate'])) {
            $message->vibrate($this->extra['vibrate']);
        }
        // Sans bouton précisé, une action propre à la rubrique (les appels fournissent les leurs : répondre / refuser).
        foreach ($this->extra['actions'] ?? ['open' => $category['action']] as $action => $title) {
            $message->action($title, $action);
        }
        if (isset($this->extra['options'])) {
            $message->options($this->extra['options']);
        }

        return $message;
    }
}

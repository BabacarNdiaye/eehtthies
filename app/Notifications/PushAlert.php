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

    public function via($notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        $message = (new WebPushMessage)
            ->title(Str::limit(trim($this->title), 60, '…'))
            ->icon('/icons/icon-192.png')
            // Petite pastille monochrome de la barre d'état Android (une icône en couleur y devient un carré gris).
            ->badge('/icons/badge-96.png')
            ->lang('fr')
            ->body(Str::limit(trim(preg_replace('/\s+/u', ' ', $this->body)), 140, '…'))
            ->vibrate([120, 60, 120])
            ->data(['url' => $this->url, 'sent_at' => now()->getTimestampMs()] + ($this->extra['data'] ?? []));

        // Grande image facultative (affichée sous le texte sur Android et dans Chrome).
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
        // Sans bouton précisé, une action « Ouvrir » (les appels fournissent les leurs : répondre / refuser).
        foreach ($this->extra['actions'] ?? ['open' => 'Ouvrir'] as $action => $title) {
            $message->action($title, $action);
        }
        if (isset($this->extra['options'])) {
            $message->options($this->extra['options']);
        }

        return $message;
    }
}

<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
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
            ->title($this->title)
            ->icon('/icons/icon-192.png')
            ->body($this->body)
            ->data(['url' => $this->url] + ($this->extra['data'] ?? []));

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
        foreach ($this->extra['actions'] ?? [] as $action => $title) {
            $message->action($title, $action);
        }
        if (isset($this->extra['options'])) {
            $message->options($this->extra['options']);
        }

        return $message;
    }
}

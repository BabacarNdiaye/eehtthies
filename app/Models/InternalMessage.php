<?php

namespace App\Models;

use App\Notifications\PushAlert;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class InternalMessage extends Model
{
    protected $fillable = [
        'sender_id', 'recipient_id', 'thread_id', 'subject', 'body', 'read_at', 'pushed_at',
        'attachment_path', 'attachment_name', 'attachment_size',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'pushed_at' => 'datetime',
    ];

    /**
     * Set true (see createQuietly()) around a bulk-creation loop — announcements,
     * class-wide sends — to skip the synchronous per-recipient push, which would
     * otherwise do one blocking HTTP webpush call per recipient inside the
     * request (fine for a single reply, not for hundreds of recipients on
     * shared hosting with no confirmed queue worker). PushPendingMessages picks
     * up every row still pushed_at=null on its next scheduled run instead.
     */
    public static bool $suppressPush = false;

    public static function createQuietly(array $attributes): self
    {
        static::$suppressPush = true;

        try {
            return static::create($attributes);
        } finally {
            static::$suppressPush = false;
        }
    }

    protected static function booted(): void
    {
        static::created(function (InternalMessage $message) {
            if (is_null($message->thread_id)) {
                $message->thread_id = $message->id;
                $message->saveQuietly();
            }

            if (static::$suppressPush) {
                return;
            }

            $message->recipient?->notify(new PushAlert(
                $message->sender?->name ?? 'Administration',
                $message->body,
                '/notifications'
            ));

            // TEMPORARY guard — remove once the pushed_at migration has run on
            // this environment (EEHT Connect Phase 1 deploy, 2026-09-28). Without
            // it, every internal message send (an already-live feature: Mail,
            // class broadcasts, replies) would 500 during the window between
            // deploying this file and the migration actually running.
            if (Schema::hasColumn('internal_messages', 'pushed_at')) {
                $message->forceFill(['pushed_at' => now()])->saveQuietly();
            }
        });
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }
}

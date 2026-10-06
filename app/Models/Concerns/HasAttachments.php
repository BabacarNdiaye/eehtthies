<?php

namespace App\Models\Concerns;

use App\Models\Attachment;

trait HasAttachments
{
    public static function bootHasAttachments(): void
    {
        static::deleting(fn ($model) => $model->attachments()->get()->each->delete());
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable')->latest()->with('uploader:id,name');
    }
}

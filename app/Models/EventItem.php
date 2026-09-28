<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EventItem extends Model
{
    protected $fillable = [
        'title', 'slug', 'description', 'image', 'location', 'start_at', 'end_at', 'is_published',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_published' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (EventItem $event) {
            if (empty($event->slug)) {
                $event->slug = Str::slug($event->title).'-'.Str::random(5);
            }
        });
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_at', '>=', now());
    }
}

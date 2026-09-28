<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobOffer extends Model
{
    protected $fillable = [
        'partner_id', 'title', 'description', 'contract_type', 'location', 'expires_at', 'is_published',
    ];

    protected $casts = [
        'expires_at' => 'date',
        'is_published' => 'boolean',
    ];

    public const CONTRACT_TYPES = [
        'cdi' => 'CDI',
        'cdd' => 'CDD',
        'stage' => 'Stage',
        'saisonnier' => 'Saisonnier',
    ];

    public function partner()
    {
        return $this->belongsTo(Partner::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()));
    }
}

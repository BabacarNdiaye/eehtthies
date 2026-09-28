<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InternshipOffer extends Model
{
    protected $fillable = [
        'partner_id', 'formation_id', 'title', 'description',
        'positions_available', 'start_date', 'end_date', 'expires_at', 'is_published',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'expires_at' => 'date',
        'is_published' => 'boolean',
    ];

    public function partner()
    {
        return $this->belongsTo(Partner::class);
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function internships()
    {
        return $this->hasMany(Internship::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()));
    }
}

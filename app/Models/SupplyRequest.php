<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplyRequest extends Model
{
    protected $fillable = ['number', 'requested_by', 'school_class_id', 'purpose', 'needed_at', 'status', 'notes', 'reviewed_by', 'reviewed_at', 'delivered_at'];

    protected $casts = ['needed_at' => 'date', 'reviewed_at' => 'datetime', 'delivered_at' => 'datetime'];

    public const STATUSES = [
        'en_attente' => 'En attente',
        'approuvee' => 'Approuvée',
        'livree' => 'Livrée',
        'refusee' => 'Refusée',
    ];

    protected static function booted(): void
    {
        static::creating(function (SupplyRequest $request) {
            $request->number ??= self::nextNumber();
        });
    }

    public static function nextNumber(): string
    {
        $prefix = 'DM-'.now()->format('Y').'-';
        $last = static::where('number', 'like', $prefix.'%')->orderByDesc('number')->value('number');
        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function lines()
    {
        return $this->hasMany(SupplyRequestLine::class);
    }
}

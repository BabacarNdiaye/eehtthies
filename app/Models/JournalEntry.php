<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class JournalEntry extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['journal_id', 'entry_date', 'reference', 'description'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('comptabilite');
    }

    protected $fillable = [
        'journal_id', 'entry_date', 'reference', 'description',
        'entryable_type', 'entryable_id', 'is_auto', 'created_by',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'is_auto' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (JournalEntry $entry) {
            if (empty($entry->reference)) {
                $entry->reference = 'ECR-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            }
        });
    }

    public function journal()
    {
        return $this->belongsTo(Journal::class);
    }

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function entryable()
    {
        return $this->morphTo();
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getTotalDebitAttribute(): float
    {
        return (float) $this->lines->sum('debit');
    }

    public function getTotalCreditAttribute(): float
    {
        return (float) $this->lines->sum('credit');
    }

    public function isBalanced(): bool
    {
        return round($this->total_debit - $this->total_credit, 2) === 0.0;
    }
}

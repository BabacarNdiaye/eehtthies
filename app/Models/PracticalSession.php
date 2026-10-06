<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PracticalSession extends Model
{
    protected $fillable = ['title', 'school_class_id', 'subject_id', 'teacher_id', 'session_date', 'notes'];

    protected $casts = [
        'session_date' => 'date',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function items()
    {
        return $this->hasMany(PracticalSessionItem::class);
    }

    public function getEstimatedCostAttribute(): float
    {
        return round((float) $this->items->sum(fn ($item) => $item->quantity_used * $item->unit_cost_at_time), 2);
    }
}

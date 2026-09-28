<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;

class TeacherSalaryPayment extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('salaires');
    }

    protected $fillable = [
        'teacher_id', 'expense_id', 'period_year', 'period_month', 'hours_worked', 'amount',
        'paid_at', 'payment_method', 'notes', 'recorded_by',
    ];

    protected $casts = [
        'hours_worked' => 'decimal:2',
        'amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

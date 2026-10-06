<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentPlan extends Model
{
    protected $fillable = [
        'student_id', 'academic_year_id', 'label', 'total_amount', 'installments_count', 'created_by',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->invoices()->withSum('payments', 'amount')->get()->sum('payments_sum_amount');
    }

    public function getBalanceAttribute(): float
    {
        return round((float) $this->total_amount - $this->paid_amount, 2);
    }

    public function getProgressPercentAttribute(): int
    {
        if ((float) $this->total_amount <= 0) {
            return 0;
        }

        return (int) min(100, round(($this->paid_amount / (float) $this->total_amount) * 100));
    }
}

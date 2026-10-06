<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicYear extends Model
{
    protected $fillable = ['label', 'start_date', 'end_date', 'is_current'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
    ];

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function schoolClasses()
    {
        return $this->hasMany(SchoolClass::class);
    }
}

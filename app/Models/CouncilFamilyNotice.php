<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Trace d'une famille prévenue de la clôture d'un conseil (DIR-07) : une seule par élève du conseil. */
class CouncilFamilyNotice extends Model
{
    protected $fillable = ['council_id', 'council_student_id', 'channels', 'sent_by', 'sent_at'];

    protected $casts = [
        'channels' => 'array',
        'sent_at' => 'datetime',
    ];

    public function councilStudent()
    {
        return $this->belongsTo(CouncilStudent::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Séance commune de plusieurs classes : un conseil par classe, tenus ensemble. */
class CouncilSitting extends Model
{
    protected $fillable = ['academic_year_id', 'term', 'is_end_of_year', 'scheduled_at', 'room', 'agenda', 'president_id', 'secretary_id', 'created_by'];

    protected $casts = [
        'is_end_of_year' => 'boolean',
        'scheduled_at' => 'datetime',
    ];

    public function councils()
    {
        return $this->hasMany(Council::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function president()
    {
        return $this->belongsTo(User::class, 'president_id');
    }

    public function secretary()
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function label(): string
    {
        return 'Séance commune · '.$this->term.($this->scheduled_at ? ' · '.$this->scheduled_at->translatedFormat('j F Y \à H\hi') : '');
    }
}

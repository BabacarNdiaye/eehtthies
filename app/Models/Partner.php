<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Partner extends Model
{
    protected $fillable = [
        'name', 'logo', 'type', 'description', 'website',
        'contact_name', 'contact_email', 'contact_phone', 'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    public function internshipOffers()
    {
        return $this->hasMany(InternshipOffer::class);
    }

    public function internships()
    {
        return $this->hasMany(Internship::class);
    }

    public function jobOffers()
    {
        return $this->hasMany(JobOffer::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = ['name', 'photo', 'role', 'formation_id', 'content', 'rating', 'is_published'];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }
}

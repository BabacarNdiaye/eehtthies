<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    protected $fillable = ['code', 'name'];

    public function entries()
    {
        return $this->hasMany(JournalEntry::class);
    }
}

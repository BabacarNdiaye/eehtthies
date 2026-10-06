<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GalleryMedia extends Model
{
    protected $fillable = ['gallery_id', 'type', 'path', 'caption', 'order'];

    public function gallery()
    {
        return $this->belongsTo(Gallery::class);
    }
}

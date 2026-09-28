<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibraryResource extends Model
{
    public const TYPES = [
        'document' => 'Document',
        'lien' => 'Lien',
    ];

    protected $fillable = ['title', 'description', 'type', 'file_path', 'thumbnail_path', 'url', 'uploaded_by'];

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

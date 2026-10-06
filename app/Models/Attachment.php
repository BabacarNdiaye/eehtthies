<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    public const DISK = 'local';

    protected $fillable = [
        'attachable_type', 'attachable_id', 'original_name', 'file_path',
        'mime_type', 'size', 'uploaded_by',
    ];

    protected $hidden = ['file_path', 'attachable_type', 'attachable_id'];

    protected static function booted(): void
    {
        static::deleting(fn (Attachment $attachment) => Storage::disk(self::DISK)->delete($attachment->file_path));
    }

    public function attachable()
    {
        return $this->morphTo();
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

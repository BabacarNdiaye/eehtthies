<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallSignal extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['call_id', 'to_user_id', 'type', 'payload'];
}

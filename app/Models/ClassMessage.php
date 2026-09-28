<?php

namespace App\Models;

use App\Notifications\PushAlert;
use Illuminate\Database\Eloquent\Model;

class ClassMessage extends Model
{
    protected $fillable = ['school_class_id', 'user_id', 'body'];

    protected static function booted(): void
    {
        static::created(function (ClassMessage $message) {
            $classmateUserIds = Student::where('school_class_id', $message->school_class_id)
                ->where('user_id', '!=', $message->user_id)
                ->whereNotNull('user_id')
                ->pluck('user_id');

            $senderName = $message->user?->name ?? 'Un élève';

            User::whereIn('id', $classmateUserIds)->get()->each(
                fn (User $user) => $user->notify(new PushAlert(
                    "Discussion de classe — {$senderName}",
                    $message->body,
                    '/espace-eleve/discussion-classe'
                ))
            );
        });
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

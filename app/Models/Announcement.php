<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class Announcement extends Model
{
    public const PRIORITIES = [
        'normale' => 'Normale',
        'importante' => 'Importante',
        'urgente' => 'Urgente',
    ];

    public const AUDIENCE_TYPES = [
        'ecole' => 'Toute l\'école',
        'formation' => 'Une formation',
        'classe' => 'Une classe',
        'enseignants' => 'Les enseignants',
        'administration' => 'L\'administration',
    ];

    protected $fillable = ['title', 'body', 'priority', 'audience_type', 'audience_id', 'recipients_count', 'created_by'];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Destinataires à qui l'annonce a été remise (avec leur état de lecture). */
    public function recipients()
    {
        return $this->belongsToMany(User::class, 'announcement_user')
            ->withPivot(['read_at', 'pushed_at'])
            ->withTimestamps();
    }

    /**
     * Resolve the actual recipient user ids for this announcement's audience,
     * computed fresh each time rather than stored, so it always reflects who
     * is currently active/enrolled/staffed.
     */
    public function recipientUserIds(): Collection
    {
        return match ($this->audience_type) {
            'ecole' => Student::where('status', 'actif')->whereNotNull('user_id')->pluck('user_id')
                ->merge(Teacher::whereNotNull('user_id')->pluck('user_id'))
                ->merge(User::adminStaff()->pluck('id'))
                ->unique()->values(),
            'formation' => Student::where('status', 'actif')->where('formation_id', $this->audience_id)->whereNotNull('user_id')->pluck('user_id'),
            'classe' => Student::where('status', 'actif')->where('school_class_id', $this->audience_id)->whereNotNull('user_id')->pluck('user_id'),
            'enseignants' => Teacher::whereNotNull('user_id')->pluck('user_id'),
            'administration' => User::adminStaff()->pluck('id'),
            default => collect(),
        };
    }
}

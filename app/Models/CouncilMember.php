<?php

namespace App\Models;

use App\Models\Concerns\GuardedByCouncilLock;
use Illuminate\Database\Eloquent\Model;

/**
 * Membre d'un conseil : un compte de l'école (personnel ou enseignant), un enseignant sans compte, ou une personne
 * extérieure (délégué, tuteur). Président, professeur principal et secrétaire sont des fonctions de ce conseil-ci.
 */
class CouncilMember extends Model
{
    use GuardedByCouncilLock;

    public const FUNCTIONS = [
        'president' => 'Président(e) du conseil',
        'main_teacher' => 'Professeur principal',
        'secretary' => 'Secrétaire de séance',
        'teacher' => 'Enseignant(e)',
        'school_life' => 'Vie scolaire',
        'delegate_student' => 'Délégué(e) des élèves',
        'delegate_parent' => 'Délégué(e) des parents',
        'tutor' => 'Tuteur de stage',
        'other' => 'Autre',
    ];

    public const ATTENDANCES = [
        'pending' => 'À appeler',
        'present' => 'Présent(e)',
        'absent' => 'Absent(e)',
        'excused' => 'Excusé(e)',
    ];

    protected $fillable = ['council_id', 'user_id', 'teacher_id', 'external_name', 'external_role', 'function', 'can_vote', 'attendance', 'remote', 'arrived_at'];

    protected $casts = [
        'can_vote' => 'boolean',
        // Présent par la visioconférence du conseil.
        'remote' => 'boolean',
        'arrived_at' => 'datetime',
    ];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->external_name ?: ($this->teacher?->full_name ?? $this->user?->name ?? 'Membre');
    }
}

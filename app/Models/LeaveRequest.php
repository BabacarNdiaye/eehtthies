<?php

namespace App\Models;

use App\Models\Concerns\HasAttachments;
use App\Notifications\PushAlert;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use HasAttachments;

    protected $fillable = [
        'user_id', 'type', 'start_date', 'end_date', 'reason',
        'status', 'reviewed_by', 'reviewed_at', 'review_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public const TYPES = [
        'conge_paye' => 'Congé payé',
        'conge_maladie' => 'Congé maladie',
        'conge_sans_solde' => 'Congé sans solde',
        'autre' => 'Autre',
    ];

    public const STATUSES = [
        'en_attente' => 'En attente',
        'approuve' => 'Approuvé',
        'refuse' => 'Refusé',
        'annule' => 'Annulé',
    ];

    protected static function booted(): void
    {
        static::updated(function (LeaveRequest $leave) {
            if (! $leave->wasChanged('status')) {
                return;
            }

            if (! in_array($leave->status, ['approuve', 'refuse'], true)) {
                return;
            }

            // Les enseignants n'ont accès qu'au portail (ils ne peuvent pas atteindre /admin/*) — on les
            // redirige vers l'espace auquel cet utilisateur a réellement accès.
            $url = $leave->user?->hasRole('enseignant') ? '/espace-enseignant/conges' : '/admin/conges';
            $verb = $leave->status === 'approuve' ? 'approuvée' : 'refusée';

            $leave->user?->notify(new PushAlert(
                "Demande de congé {$verb}",
                'Du '.$leave->start_date->format('d/m/Y').' au '.$leave->end_date->format('d/m/Y'),
                $url
            ));
        });
    }

    public function getDaysCountAttribute(): int
    {
        return (int) $this->start_date->diffInDays($this->end_date) + 1;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Action de suivi décidée par un conseil (SUI-01) : élève, problème, action, responsable, échéance, statut. Elle vit
 * après la clôture du conseil : ce modèle n'est donc pas verrouillé.
 */
class CouncilFollowUp extends Model
{
    use LogsActivity;

    public const STATUSES = [
        'todo' => 'À faire',
        'in_progress' => 'En cours',
        'done' => 'Réalisée',
        'not_done' => 'Non réalisée',
        'abandoned' => 'Abandonnée',
    ];

    public const OPEN = ['todo', 'in_progress'];

    public const FAMILY_INTERVIEW = 'family_interview';

    protected $fillable = [
        'council_id', 'student_id', 'council_decision_id', 'kind', 'problem', 'action', 'owner_id', 'due_date', 'status',
        'comment', 'completed_at', 'interview_at', 'interview_report', 'reminded_before_at', 'reminded_due_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'interview_at' => 'datetime',
        'reminded_before_at' => 'datetime',
        'reminded_due_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['action', 'owner_id', 'due_date', 'status', 'comment', 'interview_at', 'interview_report'])
            ->logOnlyDirty()->dontLogEmptyChanges()->useLogName('conseils');
    }

    public function tapActivity(Activity $activity, string $eventName): void
    {
        $activity->properties = $activity->properties->put('council_id', $this->council_id)->put('student_id', $this->student_id);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN, true);
    }

    public function isOverdue(?Carbon $today = null): bool
    {
        return $this->isOpen() && $this->due_date !== null && $this->due_date->lt(($today ?? now())->copy()->startOfDay());
    }

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function decision()
    {
        return $this->belongsTo(CouncilDecision::class, 'council_decision_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}

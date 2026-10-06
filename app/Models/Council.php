<?php

namespace App\Models;

use App\Exceptions\CouncilException;
use App\Support\CouncilLock;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Un conseil de classe : une classe, une période, une année. Il traverse six états (cahier des charges §3), chaque
 * passage étant une action explicite d'App\Services\Council\CouncilWorkflow. Clôturé, il est verrouillé (CouncilLock).
 */
class Council extends Model
{
    use LogsActivity;

    public const DRAFT = 'draft';

    public const SCHEDULED = 'scheduled';

    public const IN_SESSION = 'in_session';

    public const DRAFTING_MINUTES = 'drafting_minutes';

    public const PENDING_VALIDATION = 'pending_validation';

    public const CLOSED = 'closed';

    public const STATUSES = [
        self::DRAFT => 'Brouillon',
        self::SCHEDULED => 'Programmé',
        self::IN_SESSION => 'En séance',
        self::DRAFTING_MINUTES => 'PV en rédaction',
        self::PENDING_VALIDATION => 'À valider',
        self::CLOSED => 'Clôturé',
    ];

    protected $fillable = [
        'council_sitting_id', 'academic_year_id', 'school_class_id', 'term', 'is_end_of_year', 'scheduled_at', 'room', 'agenda', 'status',
        'president_id', 'main_teacher_id', 'secretary_id', 'preconseil_deadline', 'snapshot_taken_at', 'started_at',
        'ended_at', 'closed_at', 'closed_by', 'session_notes', 'general_observations', 'recommendations',
        'focus_council_student_id', 'focus_version', 'created_by',
    ];

    protected $casts = [
        'is_end_of_year' => 'boolean',
        'scheduled_at' => 'datetime',
        'preconseil_deadline' => 'datetime',
        'snapshot_taken_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'closed_at' => 'datetime',
        'focus_version' => 'integer',
    ];

    protected static function booted(): void
    {
        // RG-18 : un conseil clôturé ne s'écrit plus, même appelé hors des contrôleurs.
        static::saving(function (Council $council) {
            if ($council->exists) {
                CouncilLock::assertWritable($council->getOriginal('status'));
            }
        });

        static::deleting(function (Council $council) {
            CouncilLock::assertWritable($council->getOriginal('status'));

            if ($council->getOriginal('status') !== self::DRAFT) {
                throw CouncilException::rule('COUNCIL_NOT_DRAFT', 'Seul un conseil en brouillon peut être supprimé.');
            }
        });
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['scheduled_at', 'room', 'agenda', 'is_end_of_year', 'president_id', 'main_teacher_id', 'secretary_id', 'preconseil_deadline', 'general_observations', 'recommendations', 'session_notes'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('conseils');
    }

    /** Chaque entrée du journal porte le conseil : le journal d'un conseil (E08) se lit par cette propriété. */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        $activity->properties = $activity->properties->put('council_id', $this->id);
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function isClosed(): bool
    {
        return $this->status === self::CLOSED;
    }

    /** Cadre et membres se modifient en brouillon et une fois programmé (§3.2). */
    public function isFrameEditable(): bool
    {
        return in_array($this->status, [self::DRAFT, self::SCHEDULED], true);
    }

    /** La photo est figée dès l'ouverture de la séance (FIG-03, RG-17). */
    public function isSnapshotFrozen(): bool
    {
        return $this->started_at !== null;
    }

    public function label(): string
    {
        return trim(($this->schoolClass?->name ?? 'Classe').' · '.$this->term.' · '.($this->academicYear?->label ?? ''), ' ·');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function president()
    {
        return $this->belongsTo(User::class, 'president_id');
    }

    public function mainTeacher()
    {
        return $this->belongsTo(User::class, 'main_teacher_id');
    }

    public function secretary()
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function closer()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function members()
    {
        return $this->hasMany(CouncilMember::class);
    }

    /** Séance commune dont ce conseil fait partie (null : conseil tenu seul). */
    public function sitting()
    {
        return $this->belongsTo(CouncilSitting::class, 'council_sitting_id');
    }

    public function students()
    {
        return $this->hasMany(CouncilStudent::class);
    }

    public function decisions()
    {
        return $this->hasMany(CouncilDecision::class);
    }

    public function minutes()
    {
        return $this->hasMany(CouncilMinute::class)->orderBy('version');
    }

    public function validations()
    {
        return $this->hasMany(CouncilValidation::class)->orderBy('id');
    }
}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'personal_email', 'password', 'phone', 'avatar', 'is_active', 'position', 'department', 'hire_date', 'monthly_salary', 'manager_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPushSubscriptions, HasRoles, LogsActivity, Notifiable;

    protected $guard_name = 'web';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'personal_email', 'phone', 'is_active', 'position', 'department', 'hire_date', 'monthly_salary', 'manager_id'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('personnel');
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function teacher()
    {
        return $this->hasOne(Teacher::class);
    }

    public function childStudents()
    {
        return $this->hasMany(Student::class, 'parent_user_id');
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function directReports()
    {
        return $this->hasMany(User::class, 'manager_id');
    }

    public function salaryPayments()
    {
        return $this->hasMany(SalaryPayment::class);
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants')
            ->withPivot(['is_admin', 'is_favorite', 'last_read_message_id'])
            ->withTimestamps();
    }

    public function announcementsReceived()
    {
        return $this->belongsToMany(Announcement::class, 'announcement_user')
            ->withPivot(['read_at', 'pushed_at'])
            ->withTimestamps();
    }

    /** « En ligne » : une page de l'application a été chargée ou interrogée il y a moins de 2 minutes. */
    public function isOnline(): bool
    {
        return $this->last_seen_at !== null && $this->last_seen_at->gt(now()->subMinutes(2));
    }

    /**
     * Personnel administratif : tous les utilisateurs sauf ceux dont les seuls rôles relèvent des modules
     * dédiés Élèves/Enseignants (enseignants, élèves, parents).
     */
    public function scopeAdminStaff($query)
    {
        return $query->where(function ($q) {
            $q->whereDoesntHave('roles')
                ->orWhereHas('roles', fn ($r) => $r->whereNotIn('name', ['enseignant', 'eleve', 'parent']));
        });
    }

    /**
     * Retourne les attributs à convertir.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'hire_date' => 'date',
            'monthly_salary' => 'decimal:2',
        ];
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'personal_email', 'password', 'phone', 'avatar', 'is_active', 'position', 'department', 'hire_date', 'monthly_salary', 'manager_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles, LogsActivity, HasPushSubscriptions;

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

    /**
     * Administrative staff: everyone except users whose only roles belong to
     * the dedicated Élèves/Enseignants modules (teachers, students, parents).
     */
    public function scopeAdminStaff($query)
    {
        return $query->where(function ($q) {
            $q->whereDoesntHave('roles')
                ->orWhereHas('roles', fn ($r) => $r->whereNotIn('name', ['enseignant', 'eleve', 'parent']));
        });
    }

    /**
     * Get the attributes that should be cast.
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
            'hire_date' => 'date',
            'monthly_salary' => 'decimal:2',
        ];
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }
}

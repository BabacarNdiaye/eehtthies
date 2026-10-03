<?php

namespace App\Support;

use App\Models\Expense;
use App\Models\Internship;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AttachmentTargets
{
    /** alias => [modèle, module de permissions (null = règle propre au modèle)] */
    private const MAP = [
        'expense' => [Expense::class, 'comptabilite'],
        'invoice' => [Invoice::class, 'comptabilite'],
        'teacher' => [Teacher::class, 'enseignants'],
        'internship' => [Internship::class, 'insertion'],
        'leave' => [LeaveRequest::class, null],
    ];

    public static function aliases(): array
    {
        return array_keys(self::MAP);
    }

    public static function find(string $alias, int $id): ?Model
    {
        $class = self::MAP[$alias][0] ?? null;

        return $class ? $class::find($id) : null;
    }

    public static function canView(User $user, Model $target): bool
    {
        if ($target instanceof LeaveRequest) {
            return $target->user_id === $user->id || $user->can('modifier_utilisateurs');
        }

        return $user->can('voir_'.self::module($target));
    }

    public static function canManage(User $user, Model $target): bool
    {
        if ($target instanceof LeaveRequest) {
            return $target->user_id === $user->id;
        }

        $module = self::module($target);

        return $user->can("ajouter_{$module}") || $user->can("modifier_{$module}");
    }

    private static function module(Model $target): string
    {
        foreach (self::MAP as [$class, $module]) {
            if ($target instanceof $class) {
                return $module;
            }
        }

        abort(404);
    }
}

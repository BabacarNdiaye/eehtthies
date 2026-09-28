<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class OrgChartController extends Controller
{
    public function index(): Response
    {
        $staff = User::adminStaff()->with('roles:id,name')->orderBy('name')->get();

        $build = function (?int $managerId) use (&$build, $staff) {
            return $staff->where('manager_id', $managerId)->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'position' => $user->position,
                'department' => $user->department,
                'avatar' => $user->avatar,
                'role' => $user->roles->first()?->name,
                'children' => $build($user->id),
            ])->values();
        };

        return Inertia::render('Admin/OrgChart/Index', [
            'tree' => $build(null),
        ]);
    }
}

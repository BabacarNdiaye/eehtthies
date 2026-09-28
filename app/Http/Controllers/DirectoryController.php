<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shared member directory — same data contract for every portal (student,
 * teacher, parent) and the admin panel, mirroring how NotificationController
 * sits under the generic `auth` middleware rather than being duplicated per role.
 * Never exposes phone/address/personal e-mail — name, photo, role, and
 * formation/classe only, matching the discipline already used by
 * Admin/Certificates and Admin/Hr/Index.
 */
class DirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $role = $request->string('role')->value() ?: null;
        $formationId = $request->integer('formation_id') ?: null;
        $schoolClassId = $request->integer('school_class_id') ?: null;

        $students = collect();
        if (! $role || $role === 'eleve') {
            $students = Student::where('status', 'actif')
                ->whereNotNull('user_id')
                ->when($formationId, fn ($q) => $q->where('formation_id', $formationId))
                ->when($schoolClassId, fn ($q) => $q->where('school_class_id', $schoolClassId))
                ->with(['formation:id,name', 'schoolClass:id,name'])
                ->orderBy('last_name')
                ->get(['id', 'user_id', 'first_name', 'last_name', 'photo', 'formation_id', 'school_class_id']);
        }

        $teachers = collect();
        if (! $role || $role === 'enseignant') {
            $teachers = Teacher::whereNotNull('user_id')
                ->orderBy('last_name')
                ->get(['id', 'user_id', 'first_name', 'last_name', 'photo', 'specialty']);
        }

        $staff = collect();
        if (! $role || $role === 'administration') {
            $staff = User::adminStaff()->with('roles:id,name')->orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('Portal/Directory', [
            'students' => $students,
            'teachers' => $teachers,
            'staff' => $staff,
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'filters' => ['role' => $role, 'formation_id' => $formationId, 'school_class_id' => $schoolClassId],
        ]);
    }
}

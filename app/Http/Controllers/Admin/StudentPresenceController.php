<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Élèves en ligne » : qui est connecté à l'application en ce moment. La présence vient de users.last_seen_at, que
 * TrackLastSeen met à jour (au plus une fois par minute) à chaque page chargée ou interrogée : « en ligne » = actif
 * depuis moins de ONLINE_MINUTES (comme User::isOnline), « récent » = actif depuis moins de RECENT_MINUTES.
 * Seuls les élèves qui ont un compte de connexion peuvent apparaître ; les autres sont comptés à part.
 */
class StudentPresenceController extends Controller
{
    public const ONLINE_MINUTES = 2;

    public const RECENT_MINUTES = 15;

    private const STATES = ['online', 'recent', 'all', 'no_account'];

    public function index(Request $request): Response
    {
        $state = in_array($request->query('state'), self::STATES, true) ? $request->query('state') : 'recent';
        $formationId = $request->integer('formation_id') ?: null;
        $classId = $request->integer('school_class_id') ?: null;
        $search = trim((string) $request->query('q', ''));

        $online = now()->subMinutes(self::ONLINE_MINUTES);
        $recent = now()->subMinutes(self::RECENT_MINUTES);

        // Les compteurs suivent les filtres de formation, de classe et de recherche, mais pas l'onglet choisi.
        $base = Student::query()
            ->where('students.status', 'actif')
            ->when($formationId, fn ($query, int $id) => $query->where('students.formation_id', $id))
            ->when($classId, fn ($query, int $id) => $query->where('students.school_class_id', $id))
            ->when($search !== '', fn ($query) => $query->where(function ($where) use ($search) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $where->where('students.first_name', 'like', $like)->orWhere('students.last_name', 'like', $like)->orWhere('students.matricule', 'like', $like);
            }));

        $counts = [
            'online' => (clone $base)->whereHas('user', fn ($query) => $query->where('last_seen_at', '>', $online))->count(),
            'recent' => (clone $base)->whereHas('user', fn ($query) => $query->where('last_seen_at', '>', $recent))->count(),
            'with_account' => (clone $base)->whereNotNull('students.user_id')->count(),
            'without_account' => (clone $base)->whereNull('students.user_id')->count(),
        ];

        // Les classes où l'on est le plus connecté en ce moment (huit au plus), pour l'aperçu du bandeau.
        $byClass = (clone $base)
            ->whereHas('user', fn ($query) => $query->where('last_seen_at', '>', $online))
            ->join('school_classes', 'school_classes.id', '=', 'students.school_class_id')
            ->select('school_classes.name', DB::raw('count(*) as online'))
            ->groupBy('school_classes.id', 'school_classes.name')
            ->orderByDesc('online')
            ->orderBy('school_classes.name')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'online' => (int) $row->online])
            ->all();

        $list = (clone $base)
            ->with(['user:id,last_seen_at', 'formation:id,name', 'schoolClass:id,name'])
            ->when($state === 'no_account', fn ($query) => $query->whereNull('students.user_id')->orderBy('students.last_name')->orderBy('students.first_name'))
            ->when($state !== 'no_account', function ($query) use ($state, $online, $recent) {
                $query->join('users', 'users.id', '=', 'students.user_id')
                    ->select('students.*')
                    ->when($state === 'online', fn ($q) => $q->where('users.last_seen_at', '>', $online))
                    ->when($state === 'recent', fn ($q) => $q->where('users.last_seen_at', '>', $recent))
                    ->orderByDesc('users.last_seen_at');
            })
            ->paginate(30)
            ->withQueryString()
            ->through(function (Student $student) use ($online, $recent) {
                $seen = $student->user?->last_seen_at;

                return [
                    'id' => $student->id,
                    'name' => trim($student->first_name.' '.$student->last_name),
                    'matricule' => $student->matricule,
                    'class' => $student->schoolClass?->name,
                    'formation' => $student->formation?->name,
                    'last_seen_at' => $seen?->toIso8601String(),
                    'state' => $student->user_id === null ? 'no_account' : ($seen === null ? 'never' : ($seen->gt($online) ? 'online' : ($seen->gt($recent) ? 'recent' : 'offline'))),
                ];
            });

        return Inertia::render('Admin/Students/Online', [
            'students' => $list,
            'counts' => $counts,
            'byClass' => $byClass,
            'filters' => ['state' => $state, 'formation_id' => $formationId, 'school_class_id' => $classId, 'q' => $search],
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'classes' => SchoolClass::orderBy('name')->get(['id', 'name', 'formation_id']),
            'minutes' => ['online' => self::ONLINE_MINUTES, 'recent' => self::RECENT_MINUTES],
            'serverTime' => now()->toIso8601String(),
        ]);
    }
}

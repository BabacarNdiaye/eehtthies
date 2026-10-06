<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilSitting;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Models\User;
use App\Services\Council\CouncilRoster;
use App\Services\Council\CouncilSittingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Séance commune de plusieurs classes : création des conseils en une fois, programmation, appel unique, ouverture.
 * Chaque conseil se tient ensuite comme d'habitude (écran de séance avec sélecteur de classe, PV par classe).
 */
class CouncilSittingController extends Controller
{
    public function __construct(private readonly CouncilSittingService $sittings) {}

    public function create(Request $request, CouncilRoster $roster): Response
    {
        Gate::authorize('create', Council::class);
        $year = $request->integer('academic_year_id') ?: AcademicYear::where('is_current', true)->value('id');

        return Inertia::render('Admin/CouncilSittings/Create', [
            'defaults' => ['academic_year_id' => $year, 'term' => config('eeht.terms')[0] ?? ''],
            'years' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'terms' => config('eeht.terms'),
            // Classes de l'année, avec leurs enseignants (pour le professeur principal) et les périodes déjà tenues.
            'classes' => SchoolClass::with('formation:id,name')->where('academic_year_id', $year)->orderBy('name')->get()
                ->map(fn (SchoolClass $class) => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'formation' => $class->formation?->name,
                    'teachers' => $roster->teachersOf($class)->whereNotNull('user_id')->map(fn (Teacher $teacher) => ['user_id' => $teacher->user_id, 'name' => $teacher->full_name])->values(),
                    'terms_taken' => Council::where('school_class_id', $class->id)->pluck('term')->unique()->values(),
                ])->values(),
            'staff' => User::whereHas('roles', fn (Builder $query) => $query->whereNotIn('name', ['eleve', 'parent', 'enseignant']))->orderBy('name')->get(['id', 'name']),
            'functions' => collect(CouncilMember::FUNCTIONS)->except(['president', 'main_teacher', 'secretary', 'teacher'])->all(),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Council::class);
        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'term' => ['required', Rule::in(config('eeht.terms'))],
            'is_end_of_year' => ['boolean'],
            'scheduled_at' => ['required', 'date'],
            'room' => ['nullable', 'string', 'max:150'],
            'agenda' => ['nullable', 'string', 'max:5000'],
            'president_id' => ['required', 'integer', 'exists:users,id'],
            'secretary_id' => ['nullable', 'integer', 'exists:users,id'],
            'classes' => ['required', 'array', 'min:1', 'max:40'],
            'classes.*.school_class_id' => ['required', 'integer', 'distinct', Rule::exists('school_classes', 'id')->where('academic_year_id', $request->integer('academic_year_id'))],
            'classes.*.main_teacher_id' => ['nullable', 'integer', Rule::exists('teachers', 'user_id')],
            'members' => ['array', 'max:30'],
            'members.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'members.*.function' => ['required', Rule::in(array_keys(CouncilMember::FUNCTIONS))],
        ]);

        $sitting = $this->sittings->create(
            collect($data)->only(['academic_year_id', 'term', 'is_end_of_year', 'scheduled_at', 'room', 'agenda', 'president_id', 'secretary_id'])->all(),
            $data['classes'],
            $data['members'] ?? [],
            $request->user(),
        );

        return redirect()->route('admin.council-sittings.show', $sitting)->with('success', count($data['classes']).' conseils créés pour la séance commune.');
    }

    public function show(Request $request, CouncilSitting $councilSitting): Response
    {
        Gate::authorize('viewAny', Council::class);
        $councilSitting->load(['academicYear:id,label', 'president:id,name', 'secretary:id,name']);
        $first = $councilSitting->councils()->first();

        return Inertia::render('Admin/CouncilSittings/Show', [
            'sitting' => [
                'id' => $councilSitting->id,
                'label' => $councilSitting->label(),
                'term' => $councilSitting->term,
                'year' => $councilSitting->academicYear?->label,
                'is_end_of_year' => $councilSitting->is_end_of_year,
                'scheduled_at' => $councilSitting->scheduled_at?->toIso8601String(),
                'room' => $councilSitting->room,
                'agenda' => $councilSitting->agenda,
                'president' => $councilSitting->president?->name,
                'secretary' => $councilSitting->secretary?->name,
            ],
            'councils' => $this->sittings->councils($councilSitting),
            'rollCall' => $this->sittings->rollCall($councilSitting),
            'attendances' => CouncilMember::ATTENDANCES,
            'can' => [
                'schedule' => $request->user()->can('create', Council::class),
                'conduct' => $first !== null && Gate::allows('conduct', $first),
            ],
        ]);
    }

    public function schedule(Request $request, CouncilSitting $councilSitting)
    {
        Gate::authorize('create', Council::class);

        return $this->report($this->sittings->scheduleAll($councilSitting, $request->user()), 'programmé(s) : photo des données prise');
    }

    public function attendance(Request $request, CouncilSitting $councilSitting)
    {
        $this->authorizeConduct($councilSitting);
        $data = $request->validate([
            'user_id' => ['required', 'integer'],
            'attendance' => ['required', Rule::in(array_keys(CouncilMember::ATTENDANCES))],
        ]);

        $this->sittings->recordAttendance($councilSitting, $data['user_id'], $data['attendance'], $request->user());

        return back();
    }

    public function start(Request $request, CouncilSitting $councilSitting)
    {
        $this->authorizeConduct($councilSitting);
        $result = $this->sittings->startAll($councilSitting, $request->user());
        $open = $councilSitting->councils()->where('councils.status', Council::IN_SESSION)->join('school_classes', 'school_classes.id', '=', 'councils.school_class_id')
            ->orderBy('school_classes.name')->value('councils.id');

        if ($open && $result['errors'] === []) {
            return redirect()->route('council.session.show', $open)->with('success', 'Séance ouverte pour toutes les classes : passez de l’une à l’autre en haut de l’écran.');
        }

        return $this->report($result, 'ouvert(s)');
    }

    private function authorizeConduct(CouncilSitting $sitting): void
    {
        $first = $sitting->councils()->first();
        abort_unless($first && Gate::allows('conduct', $first), 403);
    }

    /** @param  array{done: int, errors: array<string, string>}  $result */
    private function report(array $result, string $verb)
    {
        $redirect = back()->with('success', "{$result['done']} conseil(s) {$verb}.");

        if ($result['errors'] !== []) {
            $redirect->with('error', collect($result['errors'])->map(fn (string $message, string $class) => "{$class} : {$message}")->implode(' '));
        }

        return $redirect;
    }
}

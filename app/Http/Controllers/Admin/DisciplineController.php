<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DisciplineRecord;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Support\Exportable;
use App\Support\TermSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Registre des sanctions de la vie scolaire. Le conseil de classe le lit pour la fiche de chaque élève et pour la
 * pastille rouge (sanction d'exclusion) ; il n'y écrit jamais.
 */
class DisciplineController extends Controller
{
    use Exportable;

    private const PER_PAGE = 20;

    /** @return array{q: string, school_class_id: int|null, level: string, from: string, to: string} */
    private function filters(Request $request): array
    {
        $date = function (string $key) use ($request): string {
            $value = (string) $request->query($key, '');

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && strtotime($value) !== false ? $value : '';
        };

        $level = (string) $request->query('level', '');

        return [
            'q' => trim(mb_substr((string) $request->query('q', ''), 0, 60)),
            'school_class_id' => $request->integer('school_class_id') ?: null,
            'level' => array_key_exists($level, DisciplineRecord::LEVELS) ? $level : '',
            'from' => $date('from'),
            'to' => $date('to'),
        ];
    }

    private function filtered(array $filters): Builder
    {
        $terms = TermSearch::terms($filters['q']);

        return DisciplineRecord::query()
            ->when($filters['school_class_id'], fn (Builder $query, int $id) => $query->where('school_class_id', $id))
            ->when($filters['level'] !== '', fn (Builder $query) => $query->where('level', $filters['level']))
            ->when($filters['from'] !== '', fn (Builder $query) => $query->whereDate('occurred_on', '>=', $filters['from']))
            ->when($filters['to'] !== '', fn (Builder $query) => $query->whereDate('occurred_on', '<=', $filters['to']))
            ->when($terms !== [], fn (Builder $query) => $query->whereHas(
                'student',
                fn (Builder $student) => TermSearch::whereEveryTerm($student, $terms, ['first_name', 'last_name', 'matricule'])
            ));
    }

    /** @return list<array{id: int, name: string, label: string}> */
    private function classes(): array
    {
        return SchoolClass::with('academicYear:id,label')
            ->orderByDesc('academic_year_id')
            ->orderBy('name')
            ->get()
            ->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'label' => $class->academicYear ? "{$class->name} · {$class->academicYear->label}" : $class->name,
            ])
            ->all();
    }

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $byLevel = $this->filtered($filters)->reorder()
            ->selectRaw('level, count(*) as total')->groupBy('level')->pluck('total', 'level');

        $records = $this->filtered($filters)
            ->with(['student:id,first_name,last_name,matricule', 'schoolClass:id,name', 'recorder:id,name'])
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (DisciplineRecord $record) => $this->present($record));

        return Inertia::render('Admin/Discipline/Index', [
            'records' => $records,
            'filters' => $filters,
            'classes' => $this->classes(),
            'levels' => DisciplineRecord::LEVELS,
            'summary' => [
                'total' => (int) $byLevel->sum(),
                'by_level' => collect(array_keys(DisciplineRecord::LEVELS))
                    ->mapWithKeys(fn (string $level) => [$level => (int) ($byLevel[$level] ?? 0)])
                    ->all(),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(DisciplineRecord $record): array
    {
        return [
            'id' => $record->id,
            'occurred_on' => $record->occurred_on->toDateString(),
            'level' => $record->level,
            'level_label' => $record->level_label,
            'reason' => $record->reason,
            'days' => $record->days,
            'student' => $record->student ? [
                'id' => $record->student->id,
                'name' => $record->student->full_name,
                'matricule' => $record->student->matricule,
            ] : null,
            'school_class' => $record->schoolClass ? ['id' => $record->schoolClass->id, 'name' => $record->schoolClass->name] : null,
            'recorded_by_name' => $record->recorder?->name,
        ];
    }

    private function formResponse(?DisciplineRecord $record, ?int $studentId = null): Response
    {
        return Inertia::render('Admin/Discipline/Form', [
            'record' => $record ? [
                'id' => $record->id,
                'student_id' => $record->student_id,
                'occurred_on' => $record->occurred_on->toDateString(),
                'level' => $record->level,
                'reason' => $record->reason,
                'days' => $record->days,
            ] : null,
            'students' => Student::where('status', 'actif')
                ->orderBy('last_name')->orderBy('first_name')
                ->get(['id', 'first_name', 'last_name', 'matricule', 'school_class_id'])
                ->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'matricule' => $student->matricule,
                    'school_class_id' => $student->school_class_id,
                ])->values(),
            'classes' => $this->classes(),
            'levels' => DisciplineRecord::LEVELS,
            'defaults' => ['student_id' => $studentId, 'occurred_on' => Carbon::today()->toDateString()],
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->formResponse(null, $request->integer('student_id') ?: null);
    }

    public function edit(DisciplineRecord $disciplineRecord): Response
    {
        return $this->formResponse($disciplineRecord);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'occurred_on' => ['required', 'date', 'before_or_equal:today'],
            'level' => ['required', Rule::in(array_keys(DisciplineRecord::LEVELS))],
            'reason' => ['required', 'string', 'max:2000'],
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ], [
            'student_id.exists' => "Cet élève n'existe pas.",
            'occurred_on.before_or_equal' => 'Les faits ne peuvent pas être datés dans le futur.',
            'reason.required' => 'Indiquez le motif de la sanction.',
            'level.in' => 'Choisissez un niveau de sanction de la liste.',
        ]);

        // Les jours ne concernent que l'exclusion temporaire.
        if ($data['level'] !== 'exclusion') {
            $data['days'] = null;
        }

        return $data;
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        DisciplineRecord::create($data + [
            'school_class_id' => Student::whereKey($data['student_id'])->value('school_class_id'),
            'recorded_by' => $request->user()->id,
        ]);

        return redirect()->route('admin.discipline.index')->with('success', 'Sanction enregistrée.');
    }

    public function update(Request $request, DisciplineRecord $disciplineRecord)
    {
        $data = $this->validated($request);

        // La classe est celle des faits : elle ne suit pas l'élève s'il change de classe, sauf si l'on corrige l'élève.
        if ((int) $data['student_id'] !== $disciplineRecord->student_id) {
            $data['school_class_id'] = Student::whereKey($data['student_id'])->value('school_class_id');
        }

        $disciplineRecord->update($data);

        return redirect()->route('admin.discipline.index')->with('success', 'Sanction mise à jour.');
    }

    public function destroy(DisciplineRecord $disciplineRecord)
    {
        $disciplineRecord->delete();

        return back()->with('success', 'Sanction supprimée.');
    }

    public function exportCsv(Request $request)
    {
        $records = $this->filtered($this->filters($request))
            ->with(['student:id,first_name,last_name,matricule', 'schoolClass:id,name', 'recorder:id,name'])
            ->orderByDesc('occurred_on')->orderByDesc('id')
            ->cursor()
            ->map(fn (DisciplineRecord $record) => [
                'date' => $record->occurred_on->format('d/m/Y'),
                'student' => $record->student?->full_name,
                'matricule' => $record->student?->matricule,
                'class' => $record->schoolClass?->name,
                'level' => $record->level_label,
                'days' => $record->days,
                'reason' => $record->reason,
                'recorded_by' => $record->recorder?->name,
            ]);

        return $this->csvResponse('sanctions-'.now()->format('Y-m-d').'.csv', [
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'student', 'label' => 'Élève'],
            ['key' => 'matricule', 'label' => 'Matricule'],
            ['key' => 'class', 'label' => 'Classe'],
            ['key' => 'level', 'label' => 'Niveau'],
            ['key' => 'days', 'label' => "Jours d'exclusion"],
            ['key' => 'reason', 'label' => 'Motif'],
            ['key' => 'recorded_by', 'label' => 'Saisi par'],
        ], $records);
    }
}

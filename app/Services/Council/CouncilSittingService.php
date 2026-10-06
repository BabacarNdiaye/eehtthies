<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilSitting;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Séance commune : un conseil par classe, créés, programmés, appelés et ouverts ensemble. Chaque conseil reste entier
 * (photo, décisions, procès-verbal, validation) : la séance n'ajoute que le regroupement.
 *
 * Membres : les membres communs (président, secrétaire et ceux qu'on choisit) siègent pour chaque classe ; chaque
 * enseignant et chaque professeur principal ne siège que pour ses classes. L'appel est fait une fois pour la séance.
 */
class CouncilSittingService
{
    public function __construct(private readonly CouncilWorkflow $workflow, private readonly CouncilRoster $roster) {}

    /**
     * @param  array<string, mixed>  $frame  academic_year_id, term, is_end_of_year, scheduled_at, room, agenda, president_id, secretary_id
     * @param  list<array{school_class_id: int, main_teacher_id?: int|null}>  $classes
     * @param  list<array{user_id: int, function?: string}>  $common  membres communs (en plus du président et du secrétaire)
     */
    public function create(array $frame, array $classes, array $common, User $by): CouncilSitting
    {
        return DB::transaction(function () use ($frame, $classes, $common, $by) {
            $sitting = CouncilSitting::create($frame + ['created_by' => $by->id]);
            $commonRows = collect($common)->unique('user_id')->map(fn (array $row) => [
                'user_id' => (int) $row['user_id'],
                'teacher_id' => Teacher::where('user_id', $row['user_id'])->value('id'),
                'function' => $row['function'] ?? 'other',
                'can_vote' => true,
            ])->values();

            foreach ($classes as $row) {
                $class = SchoolClass::findOrFail($row['school_class_id']);
                $teachers = collect($this->roster->proposeMembers($class))
                    ->filter(fn (array $member) => $member['function'] === 'teacher' && ! $commonRows->contains('user_id', $member['user_id']));

                try {
                    $this->workflow->create([
                        'council_sitting_id' => $sitting->id,
                        'academic_year_id' => $frame['academic_year_id'],
                        'school_class_id' => $class->id,
                        'term' => $frame['term'],
                        'is_end_of_year' => (bool) ($frame['is_end_of_year'] ?? false) || $frame['term'] === config('eeht.final_term'),
                        'scheduled_at' => $frame['scheduled_at'] ?? null,
                        'room' => $frame['room'] ?? null,
                        'agenda' => $frame['agenda'] ?? null,
                        'president_id' => $frame['president_id'] ?? null,
                        'secretary_id' => $frame['secretary_id'] ?? null,
                        'main_teacher_id' => $row['main_teacher_id'] ?? null,
                    ], $commonRows->concat($teachers)->values()->all(), $by);
                } catch (CouncilException $exception) {
                    if ($exception->errorCode === 'COUNCIL_DUPLICATE') {
                        throw CouncilException::rule('COUNCIL_DUPLICATE', "La classe {$class->name} a déjà son conseil pour {$frame['term']} : retirez-la de la séance ou tenez ce conseil à part.");
                    }

                    throw $exception;
                }
            }

            activity('conseils')->causedBy($by)->performedOn($sitting)
                ->withProperties(['classes' => count($classes)])
                ->log('Séance commune créée ('.count($classes).' classes)');

            return $sitting;
        });
    }

    /** @return array{done: int, errors: array<string, string>} programme chaque conseil prêt ; les autres sont signalés par classe */
    public function scheduleAll(CouncilSitting $sitting, User $by): array
    {
        return $this->each($sitting, Council::DRAFT, fn (Council $council) => $this->workflow->schedule($council, $by));
    }

    /** @return array{done: int, errors: array<string, string>} ouvre la séance de chaque conseil programmé et appelé */
    public function startAll(CouncilSitting $sitting, User $by, ?Carbon $now = null): array
    {
        return $this->each($sitting, Council::SCHEDULED, fn (Council $council) => $this->workflow->start($council, $by, $now));
    }

    /**
     * Une ligne par personne qui siège, quel que soit le nombre de ses classes.
     *
     * @return list<array{user_id: int, name: string, functions: list<string>, classes: list<string>, attendance: string, remote: bool}>
     */
    public function rollCall(CouncilSitting $sitting): array
    {
        $members = CouncilMember::with(['council.schoolClass:id,name', 'user:id,name', 'teacher:id,first_name,last_name'])
            ->whereIn('council_id', $sitting->councils()->pluck('id'))->whereNotNull('user_id')->get();

        return $members->groupBy('user_id')->map(function ($rows, $userId) {
            $attendances = $rows->pluck('attendance')->unique();

            return [
                'user_id' => (int) $userId,
                'name' => $rows->first()->display_name,
                'functions' => $rows->map(fn (CouncilMember $member) => CouncilMember::FUNCTIONS[$member->function] ?? $member->function)->unique()->values()->all(),
                'classes' => $rows->map(fn (CouncilMember $member) => $member->council?->schoolClass?->name)->filter()->unique()->sort()->values()->all(),
                'attendance' => $attendances->count() === 1 ? $attendances->first() : 'mixed',
                'remote' => $rows->contains(fn (CouncilMember $member) => $member->remote),
            ];
        })->sortBy(fn (array $person) => mb_strtolower($person['name']))->values()->all();
    }

    /** L'appel d'une personne vaut pour chacune des classes où elle siège. @return int conseils mis à jour */
    public function recordAttendance(CouncilSitting $sitting, int $userId, string $attendance, User $by): int
    {
        $updated = 0;
        foreach ($sitting->councils()->whereIn('status', [Council::SCHEDULED, Council::IN_SESSION])->get() as $council) {
            $member = CouncilMember::where('council_id', $council->id)->where('user_id', $userId)->first();
            if ($member) {
                $this->workflow->recordAttendance($council, $member, $attendance, $by);
                $updated++;
            }
        }

        return $updated;
    }

    /**
     * Conseils de la séance pour le sélecteur de l'écran de séance et la page de la séance.
     *
     * @return list<array<string, mixed>>
     */
    public function councils(CouncilSitting $sitting): array
    {
        return $sitting->councils()->with('schoolClass:id,name')
            ->withCount([
                'students as total' => fn ($query) => $query->where('has_left_class', false),
                'students as reviewed' => fn ($query) => $query->where('has_left_class', false)->where('review_status', 'reviewed'),
            ])->get()
            ->sortBy(fn (Council $council) => mb_strtolower($council->schoolClass?->name ?? ''))
            ->map(fn (Council $council) => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'reviewed' => (int) $council->reviewed,
                'total' => (int) $council->total,
                'has_main_teacher' => $council->main_teacher_id !== null,
            ])->values()->all();
    }

    /** @return array{done: int, errors: array<string, string>} */
    private function each(CouncilSitting $sitting, string $status, callable $action): array
    {
        $done = 0;
        $errors = [];
        foreach ($sitting->councils()->with('schoolClass:id,name')->where('status', $status)->get() as $council) {
            try {
                $action($council);
                $done++;
            } catch (CouncilException $exception) {
                $errors[$council->schoolClass?->name ?? "Conseil {$council->id}"] = $exception->getMessage();
            }
        }

        return ['done' => $done, 'errors' => $errors];
    }
}

<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\User;
use App\Support\CouncilLock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie d'un conseil (cahier des charges §3.1). Chaque passage est une action explicite, contrôlée ici (état de
 * départ et conditions) et écrite au journal « conseils » avec le conseil en propriété. Les droits (qui) sont contrôlés
 * en amont par CouncilPolicy ; ce service garantit le « quand » et le « à quelle condition ».
 */
class CouncilWorkflow
{
    public function __construct(
        private readonly CouncilRoster $roster,
        private readonly SnapshotService $snapshots,
    ) {}

    public static function log(Council $council, ?User $by, string $description, array $properties = []): void
    {
        activity('conseils')
            ->causedBy($by)
            ->performedOn($council)
            ->withProperties(['council_id' => $council->id] + $properties)
            ->log($description);
    }

    /**
     * @param  array<string, mixed>  $frame  année, classe, période, fin d'année, date, salle, ordre du jour, fonctions
     * @param  list<array<string, mixed>>  $members
     */
    public function create(array $frame, array $members, User $by): Council
    {
        $this->assertUnique($frame);

        return DB::transaction(function () use ($frame, $members, $by) {
            $council = Council::create($frame + ['status' => Council::DRAFT, 'created_by' => $by->id]);

            $this->roster->syncMembers($council, $members);
            $this->roster->populateStudents($council);
            self::log($council, $by, 'Conseil créé (brouillon)');

            return $council;
        });
    }

    /**
     * @param  array<string, mixed>  $frame
     * @param  list<array<string, mixed>>  $members
     */
    public function update(Council $council, array $frame, array $members, User $by): Council
    {
        CouncilLock::assertStatus($council, Council::DRAFT, Council::SCHEDULED);
        $this->assertUnique($frame, $council->id);

        return DB::transaction(function () use ($council, $frame, $members, $by) {
            $classChanged = (int) $frame['school_class_id'] !== $council->school_class_id;
            $council->update($frame);

            $this->roster->syncMembers($council, $members);

            if ($classChanged) {
                $council->students()->get()->each->delete();
            }
            $this->roster->populateStudents($council);
            self::log($council, $by, 'Cadre et membres du conseil modifiés');

            return $council;
        });
    }

    /** CRE-05 : un seul conseil par classe, par année et par période. */
    private function assertUnique(array $frame, ?int $ignoreId = null): void
    {
        $exists = Council::where('school_class_id', $frame['school_class_id'])
            ->where('academic_year_id', $frame['academic_year_id'])
            ->where('term', $frame['term'])
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw CouncilException::rule('COUNCIL_DUPLICATE', 'Un conseil existe déjà pour cette classe et cette période.');
        }
    }

    /** Brouillon → Programmé : date, président et professeur principal renseignés ; photo des données prise. */
    public function schedule(Council $council, User $by): void
    {
        CouncilLock::assertStatus($council, Council::DRAFT);

        $missing = array_keys(array_filter([
            'la date' => $council->scheduled_at === null,
            'le président' => $council->president_id === null,
            'le professeur principal' => $council->main_teacher_id === null,
        ]));

        if ($missing !== []) {
            throw CouncilException::rule('COUNCIL_INCOMPLETE', 'Pour programmer le conseil, renseignez '.implode(', ', $missing).'.');
        }

        DB::transaction(function () use ($council, $by) {
            $this->snapshots->take($council);
            $council->update(['status' => Council::SCHEDULED]);
            self::log($council, $by, 'Conseil programmé ; photo des données prise');
        });
    }

    /** Programmé → Brouillon, tant que la séance n'a pas commencé. */
    public function unschedule(Council $council, User $by): void
    {
        CouncilLock::assertStatus($council, Council::SCHEDULED);

        $council->update(['status' => Council::DRAFT]);
        self::log($council, $by, 'Programmation annulée');
    }

    /** FIG-02 : la photo se rafraîchit tant que la séance n'est pas ouverte, avec trace au journal. */
    public function refreshSnapshot(Council $council, User $by): void
    {
        CouncilLock::assertStatus($council, Council::SCHEDULED);

        $this->snapshots->take($council);
        self::log($council, $by, 'Photo des données rafraîchie');
    }

    /** SEA-02 : appel des membres, avant ou pendant la séance. */
    public function recordAttendance(Council $council, CouncilMember $member, string $attendance, User $by): void
    {
        CouncilLock::assertStatus($council, Council::SCHEDULED, Council::IN_SESSION);

        if ($member->council_id !== $council->id || ! array_key_exists($attendance, CouncilMember::ATTENDANCES)) {
            throw CouncilException::rule('COUNCIL_BAD_MEMBER', 'Ce membre ou cette présence est inconnu.');
        }

        $before = $member->attendance;
        $member->update([
            'attendance' => $attendance,
            'arrived_at' => $attendance === 'present' ? ($member->arrived_at ?? now()) : null,
        ]);

        if ($before !== $attendance) {
            self::log($council, $by, "Appel : {$member->display_name} — ".CouncilMember::ATTENDANCES[$attendance], ['old' => $before, 'new' => $attendance]);
        }
    }

    /**
     * Programmé → En séance : le jour prévu est arrivé et l'appel est fait. La photo est reprise une dernière fois puis
     * figée (FIG-01, FIG-03) : délibération et PV ne reposent plus que sur elle.
     */
    public function start(Council $council, User $by, ?Carbon $now = null): void
    {
        CouncilLock::assertStatus($council, Council::SCHEDULED);
        $now ??= now();

        if ($council->scheduled_at === null || $now->copy()->startOfDay()->lt($council->scheduled_at->copy()->startOfDay())) {
            throw CouncilException::rule('COUNCIL_TOO_EARLY', 'La séance ne peut pas commencer avant le jour prévu.');
        }

        $pending = $council->members()->where('attendance', 'pending')->count();
        if ($pending > 0) {
            throw CouncilException::rule('COUNCIL_ROLL_CALL', "Faites d'abord l'appel : {$pending} membre(s) sans présence indiquée.");
        }

        DB::transaction(function () use ($council, $by, $now) {
            $this->snapshots->take($council);
            $council->update(['status' => Council::IN_SESSION, 'started_at' => $now]);
            self::log($council, $by, 'Séance ouverte ; photo des données figée');
        });
    }
}

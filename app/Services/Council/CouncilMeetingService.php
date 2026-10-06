<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilMeeting;
use App\Models\CouncilMeetingParticipant;
use App\Models\CouncilMeetingSignal;
use App\Models\CouncilMember;
use App\Models\User;
use App\Policies\CouncilPolicy;
use App\Services\SafePush;
use App\Support\CouncilLock;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Visioconférence du conseil, pendant la séance seulement. Le son et l'image vont directement d'un navigateur à l'autre
 * (maillage WebRTC) ; ce service tient la présence (un participant reste présent tant qu'il interroge le serveur), relaie
 * les messages de mise en relation et note « présent à distance » le membre qui rejoint (quorum, procès-verbal).
 *
 * Peuvent rejoindre : les membres du conseil qui ont un compte et qui conduit la séance. Jamais les familles.
 */
class CouncilMeetingService
{
    /** Au-delà, le maillage (chacun relié à chacun) devient trop lourd pour les connexions mobiles. */
    public const MAX_PARTICIPANTS = 8;

    /** Un participant qui ne s'est pas manifesté depuis ce délai est considéré comme parti. */
    public const PRESENCE_SECONDS = 15;

    /** Conseils qui partagent la même visio : ceux de la séance commune, sinon le conseil seul. */
    private function linkedIds(Council $council): array
    {
        return $council->council_sitting_id
            ? Council::where('council_sitting_id', $council->council_sitting_id)->pluck('id')->all()
            : [$council->id];
    }

    public function openFor(Council $council): ?CouncilMeeting
    {
        return CouncilMeeting::whereIn('council_id', $this->linkedIds($council))->whereNull('ended_at')->latest('id')->first();
    }

    /** Membre de l'un des conseils de la séance (ou qui conduit la séance) : la visio est commune. */
    public function canJoin(User $user, Council $council): bool
    {
        $policy = app(CouncilPolicy::class);
        foreach (Council::whereIn('id', $this->linkedIds($council))->get() as $linked) {
            if ($policy->isMember($user, $linked)) {
                return true;
            }
        }

        return Gate::forUser($user)->allows('conduct', $council);
    }

    public function start(Council $council, User $by, string $type): CouncilMeeting
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);

        $meeting = DB::transaction(function () use ($council, $by, $type) {
            Council::whereKey($council->id)->lockForUpdate()->first();

            if ($this->openFor($council)) {
                throw CouncilException::rule('COUNCIL_MEETING_ALREADY_OPEN', 'Une visioconférence est déjà ouverte pour ce conseil : rejoignez-la.');
            }

            return CouncilMeeting::create(['council_id' => $council->id, 'type' => $type, 'started_by' => $by->id, 'started_at' => now()]);
        });

        CouncilWorkflow::log($council, $by, 'Visioconférence ouverte ('.mb_strtolower(CouncilMeeting::TYPES[$type]).')');
        $this->join($council, $by);

        // Les membres avec un compte sont prévenus (notification), sans retarder la réponse.
        $members = $council->members()->with('user')->whereNotNull('user_id')->where('user_id', '!=', $by->id)->get();
        $class = $council->schoolClass?->name ?? 'la classe';
        defer(fn () => rescue(fn () => $members->each(fn (CouncilMember $member) => SafePush::send(
            $member->user,
            'Conseil de classe en visioconférence',
            "Le conseil de {$class} se tient en ce moment : rejoignez-le à distance.",
            route('council.meeting.show', $council, false),
        ))));

        return $meeting;
    }

    /** Rejoindre : vaut présence « à distance » pour un membre qui n'était pas noté présent. */
    public function join(Council $council, User $user): CouncilMeetingParticipant
    {
        $meeting = $this->openFor($council);
        if (! $meeting || $council->status !== Council::IN_SESSION) {
            throw CouncilException::rule('COUNCIL_MEETING_NOT_OPEN', 'Aucune visioconférence n’est ouverte pour ce conseil.');
        }

        return DB::transaction(function () use ($council, $meeting, $user) {
            CouncilMeeting::whereKey($meeting->id)->lockForUpdate()->first();
            $active = $this->active($meeting);

            if ($active->count() >= self::MAX_PARTICIPANTS && ! $active->contains('user_id', $user->id)) {
                throw CouncilException::rule('COUNCIL_MEETING_FULL', 'La visioconférence est complète ('.self::MAX_PARTICIPANTS.' participants au plus) : suivez la séance par la vue projetée.');
            }

            // En séance commune, la personne est présente à distance pour chacune de ses classes.
            $memberships = CouncilMember::with('council')->whereIn('council_id', $this->linkedIds($council))->where('user_id', $user->id)->get();
            $member = $memberships->firstWhere('council_id', $council->id) ?? $memberships->first();
            $participant = CouncilMeetingParticipant::firstOrNew(['council_meeting_id' => $meeting->id, 'user_id' => $user->id]);
            if (! $participant->exists || $participant->left_at) {
                $participant->joined_at = now();
            }
            $participant->fill(['council_member_id' => $member?->id, 'last_seen_at' => now(), 'left_at' => null])->save();
            // Une page rechargée repart de zéro : les messages de sa connexion précédente la dérouteraient.
            CouncilMeetingSignal::where('council_meeting_id', $meeting->id)->where('to_user_id', $user->id)->delete();

            foreach ($memberships as $membership) {
                if ($membership->attendance !== 'present' && $membership->council?->status === Council::IN_SESSION) {
                    $membership->update(['attendance' => 'present', 'remote' => true, 'arrived_at' => $membership->arrived_at ?? now()]);
                    CouncilWorkflow::log($membership->council, $user, 'Présent à distance : '.$membership->display_name);
                }
            }

            return $participant;
        });
    }

    /**
     * Signe de vie d'un participant (micro, caméra) ; renvoie les présents et les messages qui lui sont destinés.
     *
     * @return array<string, mixed>
     */
    public function poll(Council $council, User $user, int $after, ?bool $mic = null, ?bool $cam = null): array
    {
        $meeting = $this->openFor($council);
        $participant = $meeting ? $this->participant($meeting, $user) : null;

        if ($participant) {
            $participant->update(array_filter(['last_seen_at' => now(), 'mic' => $mic, 'cam' => $cam], fn ($value) => $value !== null));
        }

        return [
            'meeting' => $meeting ? ['id' => $meeting->id, 'type' => $meeting->type, 'open' => true] : null,
            'me' => $user->id,
            'joined' => $participant !== null,
            'participants' => $meeting ? $this->active($meeting)->map(fn (CouncilMeetingParticipant $row) => [
                'user_id' => $row->user_id,
                'name' => $row->user?->name,
                'mic' => $row->mic,
                'cam' => $row->cam,
                'joined_at' => $row->joined_at->toIso8601String(),
            ])->values()->all() : [],
            'signals' => $participant ? CouncilMeetingSignal::where('council_meeting_id', $meeting->id)->where('to_user_id', $user->id)
                ->where('id', '>', $after)->orderBy('id')->limit(200)->get(['id', 'from_user_id', 'type', 'payload'])
                ->map(fn (CouncilMeetingSignal $signal) => ['id' => $signal->id, 'from' => $signal->from_user_id, 'type' => $signal->type, 'payload' => $signal->payload])
                ->all() : [],
        ];
    }

    public function signal(Council $council, User $from, int $to, string $type, string $payload): void
    {
        $meeting = $this->openFor($council);
        $active = $meeting ? $this->active($meeting) : collect();

        if (! $active->contains('user_id', $from->id) || ! $active->contains('user_id', $to)) {
            throw CouncilException::rule('COUNCIL_MEETING_NOT_PARTICIPANT', 'Ce participant n’est pas (ou plus) dans la visioconférence.');
        }

        CouncilMeetingSignal::create(['council_meeting_id' => $meeting->id, 'from_user_id' => $from->id, 'to_user_id' => $to, 'type' => $type, 'payload' => $payload]);
    }

    public function leave(Council $council, User $user): void
    {
        if ($meeting = $this->openFor($council)) {
            CouncilMeetingParticipant::where('council_meeting_id', $meeting->id)->where('user_id', $user->id)->update(['left_at' => now()]);
        }
    }

    /** Termine la visioconférence pour tous (le président, ou la fin de la délibération). */
    public function end(Council $council, ?User $by): bool
    {
        $meeting = $this->openFor($council);
        if (! $meeting) {
            return false;
        }

        $meeting->update(['ended_at' => now(), 'ended_by' => $by?->id]);
        CouncilMeetingParticipant::where('council_meeting_id', $meeting->id)->whereNull('left_at')->update(['left_at' => now()]);
        // Les messages de mise en relation n'ont plus d'usage : ils ne sont pas conservés.
        CouncilMeetingSignal::where('council_meeting_id', $meeting->id)->delete();
        if ($by) {
            CouncilWorkflow::log($council, $by, 'Visioconférence terminée');
        }

        return true;
    }

    /** Fin de délibération d'une classe : la visio (commune à la séance) ne s'arrête qu'avec la dernière classe en séance. */
    public function endIfIdle(Council $council, ?User $by): bool
    {
        $stillSitting = Council::whereIn('id', $this->linkedIds($council))->where('status', Council::IN_SESSION)->exists();

        return $stillSitting ? false : $this->end($council, $by);
    }

    /** @return Collection<int, CouncilMeetingParticipant> */
    private function active(CouncilMeeting $meeting): Collection
    {
        return CouncilMeetingParticipant::with('user:id,name')->where('council_meeting_id', $meeting->id)->whereNull('left_at')
            ->where('last_seen_at', '>=', now()->subSeconds(self::PRESENCE_SECONDS))->orderBy('joined_at')->orderBy('id')->get();
    }

    private function participant(CouncilMeeting $meeting, User $user): ?CouncilMeetingParticipant
    {
        return CouncilMeetingParticipant::where('council_meeting_id', $meeting->id)->where('user_id', $user->id)->whereNull('left_at')->first();
    }
}

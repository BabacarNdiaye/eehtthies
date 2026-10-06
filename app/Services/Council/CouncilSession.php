<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilStudent;
use App\Models\User;
use App\Support\CouncilLock;
use Illuminate\Support\Facades\DB;

/**
 * La séance (E05) : enregistrement élève par élève (appréciation, examen, décisions), élève affiché à la projection,
 * notes de séance, fin de la délibération. Tout passe par l'état « En séance ».
 */
class CouncilSession
{
    public function __construct(private readonly DecisionRulesService $rules) {}

    /**
     * @param  array{general_appreciation?: string|null, review_status: string, decisions?: list<array{decision_type_id: int, reason?: string|null}>}  $data
     */
    public function saveStudent(Council $council, CouncilStudent $row, array $data, User $by): CouncilStudent
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);

        if ($row->council_id !== $council->id) {
            throw CouncilException::rule('COUNCIL_BAD_STUDENT', 'Cet élève ne fait pas partie de ce conseil.');
        }

        $decisions = $this->rules->validate($council, $data['decisions'] ?? []);

        return DB::transaction(function () use ($council, $row, $data, $decisions, $by) {
            $before = $this->state($row);

            $row->decisions()->get()->each->delete();
            foreach ($decisions as ['type' => $type, 'reason' => $reason]) {
                CouncilDecision::create([
                    'council_id' => $council->id,
                    'council_student_id' => $row->id,
                    'decision_type_id' => $type->id,
                    'reason' => $reason,
                    'decided_by' => $by->id,
                ]);
            }

            $row->update([
                'general_appreciation' => trim((string) ($data['general_appreciation'] ?? '')) ?: null,
                'review_status' => $data['review_status'],
                'revision' => $row->revision + 1,
            ]);

            // L'élève projeté vient d'être enregistré : la projection doit relire sa décision (elle ne relit qu'au
            // changement de version).
            if ($council->focus_council_student_id === $row->id) {
                $council->update(['focus_version' => $council->focus_version + 1]);
            }

            $after = $this->state($row->fresh());
            if ($after !== $before) {
                CouncilWorkflow::log($council, $by, 'Élève examiné en séance', ['student_id' => $row->student_id, 'old' => $before, 'new' => $after]);
            }

            return $row->fresh();
        });
    }

    /** @return array{general_appreciation: string|null, review_status: string, decisions: list<string>} */
    private function state(CouncilStudent $row): array
    {
        return [
            'general_appreciation' => $row->general_appreciation,
            'review_status' => $row->review_status,
            'decisions' => $row->decisions()->with('type:id,code')->get()
                ->map(fn (CouncilDecision $decision) => $decision->type?->code.($decision->reason ? " ({$decision->reason})" : ''))
                ->sort()->values()->all(),
        ];
    }

    /** Élève affiché sur l'écran projeté (E06) : la projection le lit en interrogeant `focus_version`. */
    public function focus(Council $council, ?int $councilStudentId): int
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);

        if ($councilStudentId !== null && ! $council->students()->whereKey($councilStudentId)->exists()) {
            throw CouncilException::rule('COUNCIL_BAD_STUDENT', 'Cet élève ne fait pas partie de ce conseil.');
        }

        $council->update(['focus_council_student_id' => $councilStudentId, 'focus_version' => $council->focus_version + 1]);

        return $council->focus_version;
    }

    /** SEA-10 : observations générales sur la classe, prises pendant la séance. */
    public function saveNotes(Council $council, ?string $notes): void
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);

        $council->update(['session_notes' => trim((string) $notes) ?: null]);
    }

    /**
     * En séance → PV en rédaction : chaque élève présent est examiné, avec son appréciation générale et, en fin d'année,
     * son orientation (SEA-12, RG-10, RG-11).
     */
    public function endDeliberation(Council $council, User $by): void
    {
        CouncilLock::assertStatus($council, Council::IN_SESSION);

        $incomplete = [];
        foreach ($council->students()->with('student:id,first_name,last_name')->get() as $row) {
            if ($missing = $this->rules->missing($council, $row)) {
                $incomplete[] = ($row->student?->full_name ?? 'Élève').' ('.implode(', ', $missing).')';
            }
        }

        if ($incomplete !== []) {
            $shown = array_slice($incomplete, 0, 5);
            $more = count($incomplete) > 5 ? ' et '.(count($incomplete) - 5).' autre(s)' : '';

            throw CouncilException::rule('COUNCIL_DELIBERATION_INCOMPLETE', 'La délibération ne peut pas se terminer : '.implode(' ; ', $shown).$more.'.');
        }

        $council->update(['status' => Council::DRAFTING_MINUTES, 'ended_at' => now(), 'focus_council_student_id' => null, 'focus_version' => $council->focus_version + 1]);
        // La visioconférence n'a lieu que pendant la séance.
        app(CouncilMeetingService::class)->endIfIdle($council, $by);
        CouncilWorkflow::log($council, $by, 'Délibération terminée ; procès-verbal en rédaction');
    }
}

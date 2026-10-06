<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilStudent;
use App\Models\DecisionType;
use Illuminate\Support\Collection;

/**
 * Règles des décisions (RG-08 à RG-11, DEC-01 à DEC-04), appliquées côté serveur avant tout enregistrement : l'interface
 * les reflète mais ne les garantit pas seule.
 */
class DecisionRulesService
{
    /**
     * Contrôle l'ensemble des décisions d'un élève et le renvoie normalisé (un type une seule fois, motifs nettoyés).
     *
     * @param  list<array{decision_type_id: int, reason?: string|null}>  $selections
     * @return list<array{type: DecisionType, reason: string|null}>
     */
    public function validate(Council $council, array $selections): array
    {
        $selections = collect($selections)
            ->map(fn (array $selection) => ['id' => (int) $selection['decision_type_id'], 'reason' => trim((string) ($selection['reason'] ?? '')) ?: null])
            ->unique('id')
            ->values();

        $types = DecisionType::whereIn('id', $selections->pluck('id'))->get()->keyBy('id');

        $chosen = $selections->map(function (array $selection) use ($types) {
            $type = $types->get($selection['id']);

            if (! $type || ! $type->is_active) {
                throw CouncilException::rule('DECISION_UNKNOWN', 'Une des décisions choisies n’existe pas ou n’est plus active.');
            }

            return ['type' => $type, 'reason' => $selection['reason']];
        });

        $this->assertCategories($council, $chosen);
        $this->assertIncompatibilities($chosen);

        foreach ($chosen as ['type' => $type, 'reason' => $reason]) {
            // DEC-04 : motif obligatoire pour toute alerte et toute orientation autre que « Passage » (réglé par type).
            if ($type->requires_reason && $reason === null) {
                throw CouncilException::rule('DECISION_REASON_REQUIRED', "Indiquez le motif de « {$type->label} ».");
            }
        }

        return $chosen->all();
    }

    /** @param  Collection<int, array{type: DecisionType, reason: string|null}>  $chosen */
    private function assertCategories(Council $council, Collection $chosen): void
    {
        $byCategory = $chosen->groupBy(fn (array $item) => $item['type']->category);

        // RG-10 : l'orientation (et tout type réservé à la fin d'année) n'existe qu'au conseil de fin d'année.
        $endOfYear = $chosen->first(fn (array $item) => $item['type']->is_end_of_year_only || $item['type']->category === DecisionType::ORIENTATION);
        if ($endOfYear && ! $council->is_end_of_year) {
            throw CouncilException::rule('DECISION_END_OF_YEAR_ONLY', "« {$endOfYear['type']->label} » n’est possible qu’au conseil de fin d’année.");
        }

        // RG-08 : au plus une distinction.
        if ($byCategory->get(DecisionType::DISTINCTION, collect())->count() > 1) {
            throw CouncilException::rule('DECISION_TOO_MANY_DISTINCTIONS', 'Un élève ne reçoit qu’une seule distinction par conseil.');
        }

        // DEC-01 : une seule décision d'orientation.
        if ($byCategory->get(DecisionType::ORIENTATION, collect())->count() > 1) {
            throw CouncilException::rule('DECISION_TOO_MANY_ORIENTATIONS', 'Un élève ne reçoit qu’une seule décision d’orientation.');
        }

        // RG-09 : une distinction n'accompagne jamais une alerte.
        $distinction = $byCategory->get(DecisionType::DISTINCTION, collect())->first();
        $alert = $byCategory->get(DecisionType::ALERT, collect())->first();
        if ($distinction && $alert) {
            throw CouncilException::rule('DECISION_INCOMPATIBLE', "« {$distinction['type']->label} » et « {$alert['type']->label} » sont incompatibles : une distinction n’accompagne jamais une alerte.");
        }
    }

    /** PAR-03 : incompatibilités propres à l'école, dans les deux sens. */
    private function assertIncompatibilities(Collection $chosen): void
    {
        $types = $chosen->pluck('type');

        foreach ($types as $type) {
            $clash = $types->first(fn (DecisionType $other) => $other->id !== $type->id && in_array($other->id, $type->incompatibleIds(), true));

            if ($clash) {
                throw CouncilException::rule('DECISION_INCOMPATIBLE', "« {$type->label} » et « {$clash->label} » ne peuvent pas être décidés ensemble.");
            }
        }
    }

    /**
     * Ce qui manque à un élève pour clore la délibération (SEA-12) : appréciation générale (RG-11), décision d'orientation
     * au conseil de fin d'année (RG-10). Un élève sorti de la classe n'a rien d'obligatoire (RG-21).
     *
     * @return list<string>
     */
    public function missing(Council $council, CouncilStudent $row): array
    {
        if ($row->has_left_class) {
            return [];
        }

        $missing = [];

        if (blank($row->general_appreciation)) {
            $missing[] = 'appréciation générale';
        }

        if ($council->is_end_of_year) {
            $hasOrientation = $row->decisions()->whereHas('type', fn ($query) => $query->where('category', DecisionType::ORIENTATION))->exists();

            if (! $hasOrientation) {
                $missing[] = 'décision d’orientation';
            }
        }

        if ($row->review_status !== 'reviewed') {
            $missing[] = $row->review_status === 'on_hold' ? 'examen (mis en attente)' : 'examen';
        }

        // V3 : décision soumise à vote sans vote adopté, décision rejetée au vote, vote en cours.
        return array_merge($missing, app(VoteService::class)->missing($row));
    }
}

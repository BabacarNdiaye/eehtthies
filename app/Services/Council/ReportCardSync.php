<?php

namespace App\Services\Council;

use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilStudent;
use App\Models\DecisionType;
use App\Models\ReportCard;

/**
 * Report sur le bulletin (SUI-05) à la clôture et après chaque rectification ou recours : appréciation générale du
 * conseil, mention (distinction ou alerte publiable) et décision d'orientation, avec la mention « provisoire » tant
 * qu'un recours est en cours (REC-03). Un bulletin adossé à un conseil n'est plus réécrit par la génération des bulletins.
 */
class ReportCardSync
{
    /** Ordre de priorité des mentions quand plusieurs décisions en portent une. */
    private const MENTION_WEIGHT = ['blame' => 5, 'avertissement' => 4, 'felicitations' => 3, 'encouragement' => 2, 'tableau_honneur' => 1];

    public function sync(Council $council): int
    {
        $count = 0;
        $rows = $council->students()->with(['decisions' => fn ($query) => $query->whereIn('status', [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL]), 'decisions.type'])->get();

        foreach ($rows as $row) {
            if ($row->has_left_class) {
                continue;
            }

            $this->syncStudent($council, $row);
            $count++;
        }

        return $count;
    }

    public function syncStudent(Council $council, CouncilStudent $row): ReportCard
    {
        $decisions = $row->decisions->filter(fn (CouncilDecision $decision) => $decision->type && in_array($decision->status, [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL], true));
        $published = $decisions->filter(fn (CouncilDecision $decision) => $decision->type->is_published_on_report);

        $mention = $published->pluck('type.report_mention')->filter()
            ->sortByDesc(fn (string $mention) => self::MENTION_WEIGHT[$mention] ?? 0)->first();
        $orientation = $decisions->first(fn (CouncilDecision $decision) => $decision->type->category === DecisionType::ORIENTATION);

        $card = ReportCard::firstOrNew([
            'student_id' => $row->student_id,
            'academic_year_id' => $council->academic_year_id,
            'term' => $council->term,
        ]);

        if (! $card->exists) {
            $card->fill([
                'school_class_id' => $council->school_class_id,
                'average' => $row->general_average,
                'rank' => $row->rank,
                'class_size' => $row->class_size,
                'previous_term_average' => $row->previous_average,
            ]);
        }

        $card->fill([
            'general_appreciation' => $row->general_appreciation,
            'mention' => $mention,
            'council_id' => $council->id,
            'decision_provisional' => $orientation?->status === CouncilDecision::PROVISIONAL,
        ]);

        if ($orientation?->type->report_decision) {
            $card->decision = $orientation->type->report_decision;
        }

        $card->save();

        return $card;
    }
}

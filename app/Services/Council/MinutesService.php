<?php

namespace App\Services\Council;

use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilMember;
use App\Models\CouncilMinute;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Le procès-verbal (cahier des charges §7.2) : brouillon rendu à la demande, version définitive figée à la clôture.
 *
 * Le définitif est stocké sur le disque privé avec l'empreinte SHA-256 du fichier ; il n'est JAMAIS régénéré (une
 * rectification crée la version suivante). Le pied de page porte une empreinte du contenu (celle du fichier ne peut pas
 * s'y imprimer : elle dépend du fichier lui-même).
 */
class MinutesService
{
    /** @return array<string, mixed> les données du PV, issues de la photo et des décisions — jamais d'observation interne */
    public function data(Council $council, ?int $version = null, ?string $number = null, ?string $rectification = null): array
    {
        $council->loadMissing(['schoolClass.formation:id,name', 'academicYear:id,label', 'president:id,name', 'secretary:id,name', 'mainTeacher:id,name']);

        $members = $council->members()->with(['user:id,name', 'teacher:id,first_name,last_name'])->get();
        // Une décision rectifiée reste en base (RG-19) mais ne figure plus au PV : seule sa remplaçante y est.
        $rows = $council->students()->with([
            'student:id,first_name,last_name,matricule',
            'decisions' => fn ($query) => $query->where('status', '!=', CouncilDecision::RECTIFIED),
            'decisions.type:id,label,category',
        ])->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))
            ->values();

        return [
            'council' => $council,
            'version' => $version,
            'number' => $number,
            'rectification' => $rectification,
            'members' => collect(['present', 'absent', 'excused', 'pending'])->mapWithKeys(fn (string $attendance) => [
                $attendance => $members->where('attendance', $attendance)->map(fn (CouncilMember $member) => [
                    'name' => $member->display_name,
                    'function' => CouncilMember::FUNCTIONS[$member->function] ?? $member->function,
                    'remote' => $member->remote,
                ])->values(),
            ]),
            'summary' => ClassSummary::for($council),
            'students' => $rows->map(fn (CouncilStudent $row) => [
                'name' => $row->student?->full_name,
                'matricule' => $row->student?->matricule,
                'average' => $row->general_average,
                'rank' => $row->rank,
                'left' => $row->has_left_class,
                'decisions' => $row->decisions->map(fn (CouncilDecision $decision) => $decision->type?->label)->filter()->values()->all(),
                'appreciation' => $row->general_appreciation,
            ]),
            'followUps' => $rows->flatMap(fn (CouncilStudent $row) => $row->decisions
                ->filter(fn (CouncilDecision $decision) => $decision->type?->category === 'support')
                ->map(fn (CouncilDecision $decision) => ($row->student?->full_name ?? '').' : '.$decision->type->label))
                ->values(),
            // §7.2-7 : objet, décompte, résultat ; jamais le détail nominatif (réservé à la Direction, hors PV).
            'votes' => CouncilVote::with(['type:id,label', 'councilStudent.student:id,first_name,last_name'])
                ->where('council_id', $council->id)->whereNotNull('closed_at')->orderBy('id')->get()
                ->map(fn (CouncilVote $vote) => [
                    'student' => $vote->councilStudent?->student?->full_name,
                    'decision' => $vote->type?->label,
                    'mode' => CouncilVote::MODES[$vote->mode] ?? $vote->mode,
                    'secrecy' => CouncilVote::SECRECIES[$vote->secrecy] ?? $vote->secrecy,
                    'count' => ['for' => $vote->votes_for, 'against' => $vote->votes_against, 'abstentions' => $vote->abstentions],
                    'present' => $vote->voters_present,
                    'result' => CouncilVote::RESULTS[$vote->result] ?? $vote->result,
                    'tie_broken' => $vote->tie_broken,
                ])->values()->all(),
            'validations' => $council->validations()->with('user:id,name')->orderBy('id')->get(),
        ];
    }

    private function render(array $data, bool $draft, ?string $contentHash = null)
    {
        return Pdf::loadView('pdf.council-minutes', $data + ['draft' => $draft, 'contentHash' => $contentHash])->setPaper('a4');
    }

    /** Brouillon (PV-01) : rendu à la volée, jamais stocké, marqué « BROUILLON ». */
    public function draftPdf(Council $council)
    {
        return $this->render($this->data($council), true);
    }

    /** Numéro du PV : PV-{année de début}-{conseil sur 4 chiffres}. */
    public function numberFor(Council $council): string
    {
        $council->loadMissing('academicYear:id,label');
        $year = substr((string) ($council->academicYear?->label ?? now()->year), 0, 4);

        return sprintf('PV-%s-%04d', $year, $council->id);
    }

    /** Version définitive suivante (v1 à la clôture, v2… à chaque rectification). */
    public function finalize(Council $council, User $by, ?string $rectification = null): CouncilMinute
    {
        $version = ((int) $council->minutes()->max('version')) + 1;
        $number = $this->numberFor($council);
        $data = $this->data($council, $version, $number, $rectification);

        $contentHash = hash('sha256', json_encode([
            'number' => $number,
            'version' => $version,
            'students' => $data['students'],
            'observations' => $council->general_observations,
            'recommendations' => $council->recommendations,
        ], JSON_UNESCAPED_UNICODE));

        $bytes = $this->render($data, false, $contentHash)->output();
        $path = "councils/{$council->id}/pv-v{$version}.pdf";
        Storage::disk(CouncilMinute::DISK)->put($path, $bytes);

        return CouncilMinute::create([
            'council_id' => $council->id,
            'version' => $version,
            'number' => $number,
            'file_path' => $path,
            'sha256' => hash('sha256', $bytes),
            'content_hash' => $contentHash,
            'generated_at' => now(),
            'generated_by' => $by->id,
            'rectification_reason' => $rectification,
        ]);
    }

    /** Le fichier stocké est-il intact ? */
    public function isIntact(CouncilMinute $minute): bool
    {
        $disk = Storage::disk(CouncilMinute::DISK);

        return $disk->exists($minute->file_path) && hash('sha256', $disk->get($minute->file_path)) === $minute->sha256;
    }
}

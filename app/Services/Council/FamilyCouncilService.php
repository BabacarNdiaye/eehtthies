<?php

namespace App\Services\Council;

use App\Mail\CouncilNotice;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFamilyNotice;
use App\Models\CouncilObservation;
use App\Models\CouncilStudent;
use App\Models\Student;
use App\Models\User;
use App\Services\FamilyChannels;
use App\Services\SafePush;
use App\Support\CouncilSettings;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Ce que les familles voient et reçoivent d'un conseil (DIR-06, DIR-07, PAR-10).
 *
 * Vue famille, après la clôture seulement : appréciation générale, décisions publiables (« provisoire » pendant un
 * recours) et appréciations publiables des enseignants. Jamais d'observation interne, de synthèse du professeur
 * principal, de motif, de sanction ni de décision réservée au conseil (ENF-02). La notification annonce que les
 * résultats sont disponibles et renvoie vers l'espace de la famille, sans les donner.
 */
class FamilyCouncilService
{
    public function __construct(private readonly FamilyChannels $family) {}

    /** @return list<array<string, mixed>> conseils clôturés de l'élève, du plus récent au plus ancien */
    public function forStudent(Student $student): array
    {
        return CouncilStudent::with([
            'council.schoolClass:id,name', 'council.academicYear:id,label',
            'decisions' => fn ($query) => $query->whereIn('status', [CouncilDecision::ACTIVE, CouncilDecision::PROVISIONAL]),
            'decisions.type:id,label,is_published_on_report,sort_order',
        ])
            ->where('student_id', $student->id)->where('has_left_class', false)
            ->whereHas('council', fn ($query) => $query->where('status', Council::CLOSED))
            ->get()
            ->sortByDesc(fn (CouncilStudent $row) => $row->council->closed_at)
            ->values()
            ->map(fn (CouncilStudent $row) => [
                'id' => $row->council_id,
                'class' => $row->council->schoolClass?->name,
                'term' => $row->council->term,
                'year' => $row->council->academicYear?->label,
                'closed_at' => $row->council->closed_at?->toDateString(),
                'general_appreciation' => $row->general_appreciation,
                'decisions' => $row->decisions
                    ->filter(fn (CouncilDecision $decision) => $decision->type?->is_published_on_report)
                    ->sortBy(fn (CouncilDecision $decision) => $decision->type->sort_order)
                    ->map(fn (CouncilDecision $decision) => ['label' => $decision->type->label, 'provisional' => $decision->status === CouncilDecision::PROVISIONAL])
                    ->values()->all(),
                'subjects' => CouncilObservation::with('subject:id,name')->where('council_student_id', $row->id)->whereNotNull('appreciation')->get()
                    ->sortBy(fn (CouncilObservation $observation) => $observation->subject?->name)
                    ->map(fn (CouncilObservation $observation) => ['subject' => $observation->subject?->name, 'appreciation' => $observation->appreciation])
                    ->values()->all(),
            ])->all();
    }

    /**
     * DIR-07 : prévient chaque famille pas encore prévenue (e-mail, notification, EEHT Connect).
     *
     * @return int familles prévenues par au moins un canal
     */
    public function notify(Council $council, ?User $by = null): int
    {
        $council->loadMissing('schoolClass:id,name', 'academicYear:id,label');
        $already = CouncilFamilyNotice::where('council_id', $council->id)->pluck('council_student_id');
        $sent = 0;

        $rows = CouncilStudent::with('student.parentUser', 'student.user')
            ->where('council_id', $council->id)->where('has_left_class', false)->whereNotIn('id', $already)->get();

        foreach ($rows as $row) {
            if (! $row->student || ! $this->family->canReach($row->student)) {
                continue;
            }

            $channels = $this->deliver($council, $row->student);
            if ($channels !== []) {
                CouncilFamilyNotice::create(['council_id' => $council->id, 'council_student_id' => $row->id, 'channels' => $channels, 'sent_by' => $by?->id, 'sent_at' => now()]);
                $sent++;
            }
        }

        activity('conseils')->causedBy($by)->performedOn($council)
            ->withProperties(['council_id' => $council->id, 'families' => $sent])
            ->log("Familles prévenues de la clôture : {$sent}");

        return $sent;
    }

    /**
     * Liens WhatsApp prêts à envoyer par le secrétariat, un par élève dont un numéro est connu (le parent, sinon l'élève).
     *
     * @return list<array{student: string|null, phone: string|null, url: string, notified: bool}>
     */
    public function whatsapp(Council $council): array
    {
        $council->loadMissing('schoolClass:id,name', 'academicYear:id,label');
        $notified = CouncilFamilyNotice::where('council_id', $council->id)->pluck('council_student_id')->all();

        return CouncilStudent::with('student')->where('council_id', $council->id)->where('has_left_class', false)->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))
            ->map(function (CouncilStudent $row) use ($council, $notified) {
                $raw = $row->student?->guardian_phone ?: $row->student?->phone;
                $digits = PhoneNumber::whatsapp($raw);
                if (! $row->student || ! $digits) {
                    return null;
                }

                $text = CouncilSettings::render(CouncilSettings::familyMessage(), $this->values($council, $row->student, route('login')));

                return [
                    'student' => $row->student->full_name,
                    'phone' => PhoneNumber::display($raw),
                    'url' => 'https://wa.me/'.$digits.'?text='.rawurlencode($text),
                    'notified' => in_array($row->id, $notified, true),
                ];
            })->filter()->values()->all();
    }

    /** @return list<string> canaux réellement utilisés */
    private function deliver(Council $council, Student $student): array
    {
        $used = [];
        $reader = $student->parentUser ?? $student->user;
        $mailLink = $reader ? $this->linkFor($reader, $student) : route('login');
        $subject = CouncilSettings::render(CouncilSettings::familySubject(), $this->values($council, $student, $mailLink));

        if ($address = $this->family->mailAddress($student)) {
            try {
                Mail::to($address)->send(new CouncilNotice(
                    subjectLine: $subject,
                    eyebrow: 'Conseil de classe',
                    greeting: 'À l’attention de '.($this->family->recipientName($student) ?? 'la famille').',',
                    lines: [CouncilSettings::render(CouncilSettings::familyMessage(), $this->values($council, $student, $mailLink))],
                    actionLabel: 'Ouvrir mon espace',
                    actionUrl: $mailLink,
                ));
                $used[] = 'mail';
            } catch (Throwable $e) {
                report($e);
            }
        }

        $accounts = $this->family->accounts($student);
        foreach ($accounts as $user) {
            // Écran verrouillé : seulement l'annonce, jamais le résultat.
            SafePush::send($user, $subject, "Les résultats du conseil de classe de {$student->first_name} sont disponibles.", $this->linkFor($user, $student, false));
        }
        if ($accounts->isNotEmpty()) {
            $used[] = 'push';
        }

        $posted = false;
        foreach ($accounts as $user) {
            $body = CouncilSettings::render(CouncilSettings::familyMessage(), $this->values($council, $student, $this->linkFor($user, $student)));
            $posted = $this->family->postToConnect($user, '📋 '.$body, ['type' => 'council_results', 'council_id' => $council->id]) || $posted;
        }
        if ($posted) {
            $used[] = 'connect';
        }

        return $used;
    }

    /** Espace où la famille lit le résultat : la fiche de l'enfant (parent) ou « Notes & bulletins » (élève). */
    private function linkFor(User $user, Student $student, bool $absolute = true): string
    {
        return $student->parent_user_id === $user->id
            ? route('parent.child', ['student' => $student, 'tab' => 'notes'], $absolute)
            : route('student.grades', [], $absolute);
    }

    /** @return array<string, string> */
    private function values(Council $council, Student $student, string $link): array
    {
        return [
            '{eleve}' => $student->full_name,
            '{prenom}' => $student->first_name,
            '{classe}' => $council->schoolClass?->name ?? '',
            '{periode}' => $council->term,
            '{annee}' => $council->academicYear?->label ?? '',
            '{lien}' => $link,
        ];
    }
}

<?php

namespace App\Services\Council;

use App\Http\Middleware\EnsureUserIsStaff;
use App\Mail\CouncilNotice;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFollowUp;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\User;
use App\Services\SafePush;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Documents du conseil (§7.1) et envois : convocation (CRE-08), fiche préparatoire « document interne », relevé de
 * décisions d'un élève, convocation à un entretien famille ; alerte « note modifiée après la photo » (FIG-04).
 */
class CouncilDocuments
{
    public function __construct(private readonly PreCouncilService $preCouncil) {}

    private function frame(Council $council): Council
    {
        return $council->loadMissing(['schoolClass.formation:id,name', 'academicYear:id,label', 'president:id,name', 'mainTeacher:id,name', 'secretary:id,name']);
    }

    public function convocation(Council $council)
    {
        return Pdf::loadView('pdf.council-convocation', [
            'council' => $this->frame($council),
            'members' => $council->members()->with(['user:id,name', 'teacher:id,first_name,last_name'])->get()
                ->map(fn (CouncilMember $member) => ['name' => $member->display_name, 'function' => CouncilMember::FUNCTIONS[$member->function] ?? $member->function]),
        ])->setPaper('a4');
    }

    /** Une page par élève + synthèse de classe, à imprimer en secours ; document interne. */
    public function preparatory(Council $council)
    {
        $rows = $council->students()->with('student:id,first_name,last_name,matricule')->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))->values();

        return Pdf::loadView('pdf.council-preparatory', [
            'council' => $this->frame($council),
            'summary' => ClassSummary::for($council),
            'students' => $rows->map(fn (CouncilStudent $row) => [
                'row' => $row,
                'observations' => $this->preCouncil->forStudent($row, true),
            ]),
        ])->setPaper('a4');
    }

    public function decisionRecord(Council $council, CouncilStudent $row)
    {
        return Pdf::loadView('pdf.council-decision-record', [
            'council' => $this->frame($council),
            'row' => $row->load(['student:id,first_name,last_name,matricule', 'decisions.type']),
            'decisions' => $row->decisions->filter(fn (CouncilDecision $decision) => $decision->status !== CouncilDecision::RECTIFIED),
            'followUps' => CouncilFollowUp::with('owner:id,name')->where('council_id', $council->id)->where('student_id', $row->student_id)->get(),
            'observations' => collect($this->preCouncil->forStudent($row, false))->filter(fn (array $o) => filled($o['appreciation'])),
        ])->setPaper('a4');
    }

    public function interview(CouncilFollowUp $followUp)
    {
        return Pdf::loadView('pdf.council-interview', [
            'followUp' => $followUp->load(['student', 'owner:id,name', 'council.schoolClass:id,name']),
        ])->setPaper('a4');
    }

    /**
     * CRE-08 : convocation des membres qui ont un compte (notification de l'application + e-mail). Un envoi qui échoue
     * n'empêche pas les autres.
     *
     * @return int membres prévenus
     */
    public function sendConvocations(Council $council, User $by): int
    {
        $council = $this->frame($council);
        $users = User::whereIn('id', $council->members()->whereNotNull('user_id')->pluck('user_id'))->get();
        $when = $council->scheduled_at?->translatedFormat('l d F Y à H:i') ?? 'date à préciser';
        $title = "Conseil de classe {$council->schoolClass?->name} · {$council->term}";

        foreach ($users as $user) {
            $url = $user->hasRole('enseignant') && ! EnsureUserIsStaff::isStaff($user)
                ? route('teacher.councils.show', $council)
                : route('admin.councils.show', $council);

            SafePush::send($user, 'Convocation au conseil de classe', "{$title} — {$when}".($council->room ? " ({$council->room})" : ''), parse_url($url, PHP_URL_PATH) ?: $url);

            if ($user->email) {
                try {
                    Mail::to($user->email)->send(new CouncilNotice(
                        subjectLine: "Convocation — {$title}",
                        eyebrow: 'Conseil de classe · Convocation',
                        greeting: "Bonjour {$user->name},",
                        lines: array_values(array_filter([
                            "Vous êtes convoqué(e) au conseil de classe {$council->schoolClass?->name} ({$council->term}, {$council->academicYear?->label}), le {$when}".($council->room ? ", salle {$council->room}" : '').'.',
                            $council->agenda ? "Ordre du jour : {$council->agenda}" : null,
                            $council->preconseil_deadline ? 'Merci de saisir vos appréciations avant le '.$council->preconseil_deadline->translatedFormat('d F Y à H:i').'.' : null,
                        ])),
                        actionLabel: 'Ouvrir le conseil',
                        actionUrl: $url,
                    ));
                } catch (Throwable $e) {
                    report($e);
                }
            }
        }

        CouncilWorkflow::log($council, $by, 'Convocations envoyées', ['count' => $users->count()]);

        return $users->count();
    }

    /** FIG-04 : notes de la période modifiées après la photo (elles ne changent ni la fiche ni le PV). */
    public function gradesChangedSinceSnapshot(Council $council): int
    {
        if ($council->snapshot_taken_at === null) {
            return 0;
        }

        $exams = Exam::where('school_class_id', $council->school_class_id)
            ->where('academic_year_id', $council->academic_year_id)
            ->where('term', $council->term)
            ->pluck('id');

        return Grade::whereIn('exam_id', $exams)->where('updated_at', '>', $council->snapshot_taken_at)->count();
    }
}

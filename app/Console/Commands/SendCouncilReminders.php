<?php

namespace App\Console\Commands;

use App\Mail\CouncilNotice;
use App\Models\Council;
use App\Models\CouncilObservation;
use App\Models\Teacher;
use App\Services\Council\FollowUpService;
use App\Services\Council\PreCouncilService;
use App\Services\SafePush;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Rappels quotidiens du conseil de classe : pré-conseil à J-3 de la date limite (ou du conseil) pour les enseignants qui
 * n'ont pas fini (notification + e-mail), actions de suivi à J-7 et à l'échéance (notification). Chaque rappel tombe un
 * seul jour : la commande peut tourner tous les jours sans répéter.
 */
class SendCouncilReminders extends Command
{
    protected $signature = 'app:council-reminders';

    protected $description = 'Rappels du conseil de classe : pré-conseil (J-3) et actions de suivi (J-7, échéance)';

    public function handle(PreCouncilService $preCouncil, FollowUpService $followUps): int
    {
        $target = now()->addDays(3)->toDateString();
        $sent = 0;

        $councils = Council::with(['schoolClass:id,name'])
            ->whereIn('status', [Council::DRAFT, Council::SCHEDULED])
            ->where(fn ($query) => $query->whereDate('preconseil_deadline', $target)
                ->orWhere(fn ($q) => $q->whereNull('preconseil_deadline')->whereDate('scheduled_at', $target)))
            ->get();

        foreach ($councils as $council) {
            $rows = $council->students()->where('has_left_class', false)->pluck('id');

            foreach ($council->members()->whereIn('function', ['teacher', 'main_teacher'])->whereNotNull('user_id')->with('user')->get() as $member) {
                $teacher = Teacher::where('user_id', $member->user_id)->first();
                if (! $teacher || ! $member->user) {
                    continue;
                }

                $subjects = $preCouncil->subjectsOf($teacher, $council)->pluck('id');
                $expected = $subjects->count() * $rows->count();
                $done = CouncilObservation::where('council_id', $council->id)->whereIn('subject_id', $subjects)->whereIn('council_student_id', $rows)->whereNotNull('appreciation')->count();

                if ($expected === 0 || $done >= $expected) {
                    continue;
                }

                $title = "Conseil {$council->schoolClass?->name} · {$council->term}";
                $url = route('teacher.councils.precouncil', $council);
                SafePush::send($member->user, 'Pré-conseil à compléter', "{$title} : {$done} / {$expected} appréciations saisies, 3 jours restants.", parse_url($url, PHP_URL_PATH));

                if ($member->user->email) {
                    try {
                        Mail::to($member->user->email)->send(new CouncilNotice(
                            subjectLine: "Pré-conseil à compléter — {$title}",
                            eyebrow: 'Conseil de classe · Pré-conseil',
                            greeting: "Bonjour {$member->user->name},",
                            lines: ["Il vous reste trois jours pour saisir vos appréciations : {$done} sur {$expected} sont faites."],
                            actionLabel: 'Saisir mes appréciations',
                            actionUrl: $url,
                        ));
                    } catch (Throwable $e) {
                        report($e);
                    }
                }
                $sent++;
            }
        }

        $actions = $followUps->remind();
        $this->info("Pré-conseil : {$sent} rappel(s) ; actions de suivi : {$actions} rappel(s).");

        return self::SUCCESS;
    }
}

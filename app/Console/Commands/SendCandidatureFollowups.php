<?php

namespace App\Console\Commands;

use App\Mail\CandidatureFollowup;
use App\Models\Candidature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SendCandidatureFollowups extends Command
{
    protected $signature = 'app:send-candidature-followups';

    protected $description = 'Relance par e-mail les candidats dont le dossier est resté en brouillon ou incomplet, à des paliers fixes (3, 7, 14 jours sans activité) pour les encourager à finaliser leur candidature.';

    private const MILESTONES = [3, 7, 14];

    private const FOLLOWED_UP_STATUSES = ['brouillon', 'dossier_incomplet'];

    public function handle(): int
    {
        $today = Carbon::today();

        $candidatures = Candidature::whereIn('status', self::FOLLOWED_UP_STATUSES)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->with('formation:id,name')
            ->get()
            ->filter(fn (Candidature $c) => in_array((int) $today->diffInDays($c->updated_at->copy()->startOfDay(), absolute: true), self::MILESTONES, true));

        $sent = 0;

        foreach ($candidatures as $candidature) {
            Mail::to($candidature->email)->send(new CandidatureFollowup($candidature));
            $sent++;
        }

        $this->info("Relances envoyées : {$sent}.");

        return self::SUCCESS;
    }
}

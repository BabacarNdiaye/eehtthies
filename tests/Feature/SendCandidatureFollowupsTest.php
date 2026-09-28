<?php

namespace Tests\Feature;

use App\Mail\CandidatureFollowup;
use App\Models\Candidature;
use App\Models\Formation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendCandidatureFollowupsTest extends TestCase
{
    use RefreshDatabase;

    private ?Formation $formation = null;

    private function makeCandidature(string $status, int $daysSinceUpdate, string $email = 'candidat@example.com'): Candidature
    {
        if (! $this->formation) {
            $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        }

        $candidature = Candidature::create([
            'first_name' => 'Awa', 'last_name' => 'Test', 'status' => $status, 'email' => $email,
            'phone' => '770000000', 'formation_id' => $this->formation->id,
        ]);
        // updated_at is not fillable, and auto-set to now() on create; back-date it
        // directly (forceFill bypasses the fillable guard) to simulate inactivity.
        $candidature->timestamps = false;
        $candidature->forceFill(['updated_at' => now()->startOfDay()->subDays($daysSinceUpdate)])->save();

        return $candidature->fresh();
    }

    public function test_follows_up_a_draft_candidature_at_the_3_day_milestone(): void
    {
        Mail::fake();
        $c = $this->makeCandidature('brouillon', 3);

        Artisan::call('app:send-candidature-followups');

        Mail::assertSent(CandidatureFollowup::class, fn ($mail) => $mail->candidature->is($c));
    }

    public function test_follows_up_an_incomplete_file_at_the_7_day_milestone(): void
    {
        Mail::fake();
        $c = $this->makeCandidature('dossier_incomplet', 7);

        Artisan::call('app:send-candidature-followups');

        Mail::assertSent(CandidatureFollowup::class, fn ($mail) => $mail->candidature->is($c));
    }

    public function test_does_not_follow_up_on_a_non_milestone_day(): void
    {
        Mail::fake();
        $this->makeCandidature('brouillon', 4);

        Artisan::call('app:send-candidature-followups');

        Mail::assertNothingSent();
    }

    public function test_does_not_follow_up_a_submitted_candidature(): void
    {
        Mail::fake();
        $this->makeCandidature('soumise', 3);

        Artisan::call('app:send-candidature-followups');

        Mail::assertNothingSent();
    }

    public function test_does_not_follow_up_an_accepted_candidature(): void
    {
        Mail::fake();
        $this->makeCandidature('acceptee', 3);

        Artisan::call('app:send-candidature-followups');

        Mail::assertNothingSent();
    }

    public function test_skips_a_candidature_with_a_blank_email(): void
    {
        Mail::fake();
        $this->makeCandidature('brouillon', 3, '');

        Artisan::call('app:send-candidature-followups');

        Mail::assertNothingSent();
    }
}

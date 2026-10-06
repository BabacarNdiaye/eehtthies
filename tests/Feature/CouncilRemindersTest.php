<?php

namespace Tests\Feature;

use App\Mail\CouncilNotice;
use App\Models\CouncilObservation;
use App\Notifications\PushAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/** Rappel du pré-conseil à J-3 aux enseignants qui n'ont pas fini (§7.3). */
class CouncilRemindersTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    public function test_teachers_who_have_not_finished_are_reminded_three_days_before_the_deadline(): void
    {
        Mail::fake();
        Notification::fake();
        $this->councilWorld();
        $this->pupil('Awa');
        $cuisine = $this->subject('Cuisine');
        $anglais = $this->subject('Anglais');
        $late = $this->teacher('Retard', [$cuisine])[0];
        $done = $this->teacher('Fini', [$anglais])[0];
        $council = $this->makeCouncil(['preconseil_deadline' => '2026-11-18 18:00:00'], [
            ['user_id' => $late->id, 'function' => 'teacher'],
            ['user_id' => $done->id, 'function' => 'teacher'],
        ]);
        CouncilObservation::create(['council_id' => $council->id, 'council_student_id' => $council->students()->first()->id, 'subject_id' => $anglais->id, 'appreciation' => 'Bien']);

        $this->travelTo(Carbon::parse('2026-11-14 07:45'));
        $this->artisan('app:council-reminders')->assertSuccessful();
        Notification::assertNothingSent();

        $this->travelTo(Carbon::parse('2026-11-15 07:45'));
        $this->artisan('app:council-reminders')->assertSuccessful();

        Notification::assertSentTo($late, PushAlert::class);
        Notification::assertNotSentTo($done, PushAlert::class);
        Mail::assertSent(CouncilNotice::class, 1);
    }
}

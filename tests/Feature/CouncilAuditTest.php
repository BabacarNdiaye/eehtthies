<?php

namespace Tests\Feature;

use App\Models\CouncilMember;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Journal d'audit d'un conseil (E08, ENF-05) : auteur, date, élève, ancienne et nouvelle valeur ; filtres et CSV ; réservé
 * à la Direction et au responsable pédagogique.
 */
class CouncilAuditTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    public function test_the_journal_restores_author_date_student_and_values(): void
    {
        $this->councilWorld();
        $awa = $this->pupil('Awa');
        $manager = $this->staff('responsable-pedagogique', 'Responsable');
        $workflow = app(CouncilWorkflow::class);
        $council = $this->makeCouncil(['president_id' => $manager->id], [], $manager);
        $workflow->schedule($council, $manager);
        $council->members()->get()->each(fn (CouncilMember $member) => $member->update(['attendance' => 'present']));
        $workflow->start($council->fresh(), $manager, Carbon::parse('2026-11-20 15:00'));
        $row = $council->students()->firstOrFail();
        app(CouncilSession::class)->saveStudent($council->fresh(), $row, ['general_appreciation' => 'Appréciation A', 'review_status' => 'reviewed', 'decisions' => []], $manager);
        app(CouncilSession::class)->saveStudent($council->fresh(), $row->fresh(), ['general_appreciation' => 'Appréciation B', 'review_status' => 'reviewed', 'decisions' => []], $manager);

        $this->actingAs($manager)->get(route('admin.councils.audit', $council))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Audit')
            ->where('entries.data.0.action', 'Élève examiné en séance')
            ->where('entries.data.0.user', 'Responsable')
            ->where('entries.data.0.student', 'Awa Diop')
            ->where('entries.data.0.old.general_appreciation', 'Appréciation A')
            ->where('entries.data.0.new.general_appreciation', 'Appréciation B'));

        $filtered = $this->actingAs($manager)->get(route('admin.councils.audit', [$council, 'student_id' => $awa->id]))->viewData('page')['props']['entries']['total'];
        $this->assertSame(2, $filtered);
        $byAction = $this->actingAs($manager)->get(route('admin.councils.audit', [$council, 'action' => 'programmé']))->viewData('page')['props']['entries']['total'];
        $this->assertSame(1, $byAction);

        $csv = $this->actingAs($manager)->get(route('admin.councils.audit.csv', $council))->streamedContent();
        $this->assertStringContainsString('Appréciation B', $csv);
        $this->assertStringContainsString('Ancienne valeur', $csv);

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.audit', $council))->assertForbidden();
        $this->actingAs($this->staff('vie-scolaire'))->get(route('admin.councils.audit.csv', $council))->assertForbidden();
    }
}

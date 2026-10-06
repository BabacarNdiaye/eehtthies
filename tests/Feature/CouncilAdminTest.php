<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\CouncilMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Écrans E01 à E03 et transitions d'avant séance, par HTTP, avec les droits de chaque profil.
 */
class CouncilAdminTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
    }

    private function payload(array $overrides = []): array
    {
        return $overrides + [
            'academic_year_id' => $this->year->id,
            'school_class_id' => $this->class->id,
            'term' => 'Semestre 1',
            'is_end_of_year' => false,
            'scheduled_at' => '2026-11-20T15:00',
            'room' => 'Salle 3',
            'agenda' => 'Bilan du semestre',
            'president_id' => null,
            'main_teacher_id' => $this->teacher('Principal')[0]->id,
            'secretary_id' => null,
            'members' => [['external_name' => 'Aïda Ndiaye', 'external_role' => 'Déléguée des parents', 'function' => 'delegate_parent', 'can_vote' => false]],
            'action' => 'draft',
        ];
    }

    public function test_the_list_shows_the_councils_of_the_year_with_their_counts(): void
    {
        $this->pupil('Awa');
        $council = $this->makeCouncil();

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Index')
            ->where('councils.total', 1)
            ->where('councils.data.0.id', $council->id)
            ->where('councils.data.0.status', 'draft')
            ->where('councils.data.0.students_count', 1)
            ->where('counts.upcoming', 1)
            ->where('counts.closed', 0)
            ->where('canCreate', false));
    }

    public function test_the_list_is_closed_to_those_without_the_permission_and_to_teachers(): void
    {
        $this->actingAs($this->staff('comptable'))->get(route('admin.councils.index'))->assertForbidden();
        $this->actingAs($this->teacher('Moussa')[0])->get(route('admin.councils.index'))->assertForbidden();
        $this->actingAs($this->staff('eleve'))->get(route('admin.councils.index'))->assertForbidden();
    }

    public function test_the_list_filters_by_status_group(): void
    {
        $by = $this->staff('direction');
        $this->makeCouncil([], [], $by);
        $this->makeCouncil(['term' => 'Semestre 2'], [], $by);
        Council::where('term', 'Semestre 2')->update(['status' => Council::CLOSED]);

        $total = fn (array $query) => $this->actingAs($by)->get(route('admin.councils.index', $query))->viewData('page')['props']['councils']['total'];

        $this->assertSame(2, $total([]));
        $this->assertSame(1, $total(['group' => 'closed']));
        $this->assertSame(1, $total(['group' => 'upcoming']));
        $this->assertSame(0, $total(['status' => 'in_session']));
    }

    public function test_the_creation_form_and_the_member_proposal(): void
    {
        $cuisine = $this->subject('Cuisine');
        [, $teacher] = $this->teacher('Moussa', [$cuisine]);
        $this->pupil('Awa');
        $manager = $this->staff('responsable-pedagogique');

        $this->actingAs($manager)->get(route('admin.councils.create'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Form')
            ->where('council', null)
            ->has('staff')
            ->has('teachers')
            ->where('functions.delegate_parent', 'Délégué(e) des parents'));

        $this->actingAs($manager)->getJson(route('admin.councils.proposal', ['school_class_id' => $this->class->id]))
            ->assertOk()
            ->assertJsonPath('students_count', 1)
            ->assertJsonPath('members.0.teacher_id', $teacher->id);
    }

    public function test_a_council_is_created_as_a_draft(): void
    {
        $manager = $this->staff('responsable-pedagogique');

        $response = $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload());

        $council = Council::firstOrFail();
        $response->assertRedirect(route('admin.councils.show', $council));
        $this->assertSame(Council::DRAFT, $council->status);
        $this->assertSame('Aïda Ndiaye', $council->members()->where('function', 'delegate_parent')->value('external_name'));
        $this->assertSame($manager->id, $council->created_by);
    }

    public function test_a_council_can_be_created_and_scheduled_in_one_go(): void
    {
        $manager = $this->staff('responsable-pedagogique');

        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['president_id' => $manager->id, 'action' => 'schedule']))
            ->assertSessionHas('success');

        $this->assertSame(Council::SCHEDULED, Council::firstOrFail()->status);
    }

    public function test_scheduling_without_a_president_keeps_the_draft_and_says_why(): void
    {
        $this->actingAs($this->staff('direction'))->post(route('admin.councils.store'), $this->payload(['action' => 'schedule']))
            ->assertSessionHas('error');

        $this->assertSame(Council::DRAFT, Council::firstOrFail()->status);
    }

    public function test_invalid_frames_are_refused(): void
    {
        $manager = $this->staff('direction');
        $otherYear = AcademicYear::create(['label' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30']);

        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['term' => 'Trimestre 4']))->assertSessionHasErrors('term');
        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['academic_year_id' => $otherYear->id]))->assertSessionHasErrors('school_class_id');
        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['main_teacher_id' => $manager->id]))->assertSessionHasErrors('main_teacher_id');
        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['members' => [['function' => 'tutor']]]))->assertSessionHasErrors('members.0.external_name');
        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload(['members' => [['external_name' => 'X', 'function' => 'president']]]))->assertSessionHasErrors('members.0.function');

        $this->assertSame(0, Council::count());
    }

    public function test_a_duplicate_council_is_refused_with_a_message(): void
    {
        $manager = $this->staff('direction');
        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload());

        $this->actingAs($manager)->post(route('admin.councils.store'), $this->payload())->assertSessionHas('error');

        $this->assertSame(1, Council::count());
    }

    public function test_only_creators_may_create(): void
    {
        foreach (['secretariat', 'vie-scolaire', 'comptable'] as $role) {
            $this->actingAs($this->staff($role))->post(route('admin.councils.store'), $this->payload())->assertForbidden();
        }

        $this->assertSame(0, Council::count());
    }

    public function test_the_detail_page_shows_students_members_summary_and_abilities(): void
    {
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $awa, 8);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->actingAs($by)->post(route('admin.councils.schedule', $council));

        $this->actingAs($by)->get(route('admin.councils.show', $council))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Councils/Show')
            ->where('council.status', 'scheduled')
            ->where('students.0.name', 'Awa Diop')
            ->where('students.0.alert_level', 'red')
            ->has('students.0.alert_reasons', 1)
            ->where('summary.count', 1)
            ->where('summary.alerts.red', 1)
            ->has('members')
            ->where('can.conduct', true)
            ->where('can.update', true));
    }

    public function test_the_secretariat_sees_the_council_but_not_the_reasons_of_the_alerts(): void
    {
        $awa = $this->pupil('Awa');
        $this->grade($this->exam($this->subject('Cuisine')), $awa, 8);
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->actingAs($by)->post(route('admin.councils.schedule', $council));

        $this->actingAs($this->staff('secretariat'))->get(route('admin.councils.show', $council))->assertInertia(fn (Assert $page) => $page
            ->where('students.0.alert_level', 'red')
            ->where('students.0.alert_reasons', [])
            ->where('can.conduct', false)
            ->where('can.export', true));
    }

    public function test_the_transitions_through_http(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);

        $this->actingAs($by)->post(route('admin.councils.schedule', $council))->assertSessionHas('success');
        $this->assertSame(Council::SCHEDULED, $council->fresh()->status);

        $this->actingAs($by)->post(route('admin.councils.snapshot', $council))->assertSessionHas('success');

        $this->actingAs($by)->post(route('admin.councils.unschedule', $council))->assertSessionHas('success');
        $this->assertSame(Council::DRAFT, $council->fresh()->status);

        $this->actingAs($by)->post(route('admin.councils.unschedule', $council))->assertSessionHas('error');
    }

    public function test_the_roll_call_and_the_start_of_the_session(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->actingAs($by)->post(route('admin.councils.schedule', $council));

        foreach ($council->members as $member) {
            $this->actingAs($by)->patch(route('admin.councils.attendance', [$council, $member]), ['attendance' => 'present'])->assertRedirect();
        }
        $this->assertSame(0, $council->members()->where('attendance', 'pending')->count());

        $this->travelTo(Carbon::parse('2026-11-20 15:10'));
        $this->actingAs($by)->post(route('admin.councils.start', $council))->assertSessionHas('success');

        $this->assertSame(Council::IN_SESSION, $council->fresh()->status);
    }

    public function test_a_json_write_on_a_closed_council_answers_423(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $member = $council->members()->firstOrFail();
        Council::whereKey($council->id)->update(['status' => Council::CLOSED]);

        $this->actingAs($by)->patchJson(route('admin.councils.attendance', [$council, $member]), ['attendance' => 'present'])
            ->assertStatus(423)
            ->assertJsonPath('code', 'COUNCIL_LOCKED');

        $this->actingAs($by)->postJson(route('admin.councils.schedule', $council))->assertStatus(423);
        $this->assertSame('pending', $member->fresh()->attendance);
    }

    public function test_a_draft_can_be_edited_and_deleted(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);

        $this->actingAs($by)->get(route('admin.councils.edit', $council))->assertInertia(fn (Assert $page) => $page->component('Admin/Councils/Form')->where('council.id', $council->id));
        $this->actingAs($by)->put(route('admin.councils.update', $council), $this->payload(['room' => 'Amphi', 'president_id' => $by->id]))->assertRedirect();
        $this->assertSame('Amphi', $council->fresh()->room);

        $this->actingAs($by)->delete(route('admin.councils.destroy', $council))->assertRedirect(route('admin.councils.index'));
        $this->assertSame(0, Council::count());
        $this->assertSame(0, CouncilMember::count());
    }

    public function test_a_scheduled_council_cannot_be_deleted(): void
    {
        $by = $this->staff('direction');
        $council = $this->makeCouncil([], [], $by);
        $this->actingAs($by)->post(route('admin.councils.schedule', $council));

        $this->actingAs($by)->delete(route('admin.councils.destroy', $council))->assertForbidden();
        $this->assertSame(1, Council::count());
    }
}

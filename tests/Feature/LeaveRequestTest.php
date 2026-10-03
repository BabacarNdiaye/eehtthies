<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use App\Models\User;
use App\Notifications\PushAlert;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_member_can_submit_a_leave_request(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('administration');

        $response = $this->actingAs($user)->post(route('admin.leave.store'), [
            'type' => 'conge_paye',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-05',
            'reason' => 'Congé annuel',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('leave_requests', [
            'user_id' => $user->id,
            'type' => 'conge_paye',
            'status' => 'en_attente',
        ]);
    }

    public function test_staff_member_without_review_permission_only_sees_their_own_requests(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $requester = User::factory()->create();
        $requester->assignRole('caissier'); // no modifier_utilisateurs
        $other = User::factory()->create();
        $other->assignRole('caissier');

        LeaveRequest::create(['user_id' => $requester->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);
        LeaveRequest::create(['user_id' => $other->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);

        $response = $this->actingAs($requester)->get(route('admin.leave.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('canReview', false)
            ->has('requests.data', 1)
        );
    }

    public function test_user_without_permission_cannot_approve_a_leave_request(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $requester = User::factory()->create();
        $requester->assignRole('caissier');
        $leave = LeaveRequest::create(['user_id' => $requester->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);

        $response = $this->actingAs($requester)->patch(route('admin.leave.status', $leave), ['status' => 'approuve']);

        $response->assertForbidden();
        $this->assertDatabaseHas('leave_requests', ['id' => $leave->id, 'status' => 'en_attente']);
    }

    public function test_user_with_permission_can_approve_and_requester_is_notified(): void
    {
        Notification::fake();
        $this->seed(RolesAndPermissionsSeeder::class);
        $requester = User::factory()->create();
        $requester->assignRole('caissier');
        $approver = User::factory()->create();
        $approver->assignRole('administration'); // has modifier_utilisateurs
        $leave = LeaveRequest::create(['user_id' => $requester->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);

        $response = $this->actingAs($approver)->patch(route('admin.leave.status', $leave), ['status' => 'approuve']);

        $response->assertRedirect();
        $this->assertDatabaseHas('leave_requests', ['id' => $leave->id, 'status' => 'approuve', 'reviewed_by' => $approver->id]);
        Notification::assertSentTo($requester, PushAlert::class);
    }

    public function test_teacher_can_manage_their_own_leave_via_portal(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $teacher = User::factory()->create();
        $teacher->assignRole('enseignant');

        $store = $this->actingAs($teacher)->post(route('teacher.leave.store'), [
            'type' => 'conge_maladie',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-01',
        ]);
        $store->assertRedirect();

        $leave = LeaveRequest::where('user_id', $teacher->id)->firstOrFail();

        $cancel = $this->actingAs($teacher)->post(route('teacher.leave.cancel', $leave));
        $cancel->assertRedirect();
        $this->assertDatabaseHas('leave_requests', ['id' => $leave->id, 'status' => 'annule']);
    }

    public function test_teacher_cannot_reach_the_admin_leave_pages(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $teacher = User::factory()->create();
        $teacher->assignRole('enseignant');

        $response = $this->actingAs($teacher)->get(route('admin.leave.index'));

        $response->assertForbidden();
    }

    public function test_cannot_cancel_someone_elses_leave_request(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $owner = User::factory()->create();
        $owner->assignRole('caissier');
        $other = User::factory()->create();
        $other->assignRole('caissier');
        $leave = LeaveRequest::create(['user_id' => $owner->id, 'type' => 'conge_paye', 'start_date' => '2026-10-01', 'end_date' => '2026-10-02']);

        $response = $this->actingAs($other)->post(route('admin.leave.cancel', $leave));

        $response->assertForbidden();
    }
}

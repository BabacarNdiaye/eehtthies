<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Self-service leave requests for teachers — same shape as Admin\LeaveController's own-requests view. */
class TeacherLeaveController extends Controller
{
    public function index(Request $request): Response
    {
        $requests = LeaveRequest::where('user_id', $request->user()->id)
            ->with('reviewedBy:id,name')
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Portal/Teacher/Leave', [
            'requests' => $requests,
            'types' => LeaveRequest::TYPES,
            'statuses' => LeaveRequest::STATUSES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'in:'.implode(',', array_keys(LeaveRequest::TYPES))],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        LeaveRequest::create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        return back()->with('success', 'Demande de congé envoyée.');
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless($leaveRequest->user_id === $request->user()->id, 403);
        abort_unless($leaveRequest->status === 'en_attente', 422, 'Seule une demande en attente peut être annulée.');

        $leaveRequest->update(['status' => 'annule']);

        return back()->with('success', 'Demande annulée.');
    }
}

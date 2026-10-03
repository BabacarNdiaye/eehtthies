<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LeaveController extends Controller
{
    public function index(Request $request): Response
    {
        $canReview = $request->user()->can('modifier_utilisateurs');

        $query = LeaveRequest::with(['user:id,name', 'reviewedBy:id,name', 'attachments'])
            ->orderByDesc('created_at');

        if (! $canReview) {
            $query->where('user_id', $request->user()->id);
        }

        return Inertia::render('Admin/Leave/Index', [
            'requests' => $query->paginate(20)->withQueryString()
                ->through(fn (LeaveRequest $r) => tap($r, fn ($r) => $r->setAttribute('can_attach', $r->user_id === $request->user()->id))),
            'types' => LeaveRequest::TYPES,
            'statuses' => LeaveRequest::STATUSES,
            'canReview' => $canReview,
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

    public function updateStatus(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless($request->user()->can('modifier_utilisateurs'), 403);

        $data = $request->validate([
            'status' => ['required', 'in:approuve,refuse'],
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $leaveRequest->update([
            ...$data,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Demande mise à jour.');
    }
}

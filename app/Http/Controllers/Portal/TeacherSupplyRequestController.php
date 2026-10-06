<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SupplyRequest;
use App\Models\User;
use App\Services\SafePush;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Demandes de matériel de l'enseignant pour ses ateliers et ses cours : il demande, l'économe approuve puis livre. */
class TeacherSupplyRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $requests = SupplyRequest::where('requested_by', $request->user()->id)
            ->with('schoolClass:id,name', 'lines.product:id,name,unit')
            ->latest('id')
            ->paginate(10)
            ->through(fn (SupplyRequest $r) => [
                'id' => $r->id,
                'number' => $r->number,
                'status' => $r->status,
                'purpose' => $r->purpose,
                'class' => $r->schoolClass?->name,
                'needed_at' => $r->needed_at?->toDateString(),
                'created_at' => $r->created_at->toDateString(),
                'lines' => $r->lines->map(fn ($l) => ['product' => $l->product->name, 'unit' => $l->product->unit, 'quantity' => (float) $l->quantity])->values(),
            ]);

        return Inertia::render('Portal/Teacher/SupplyRequests', [
            'requests' => $requests,
            'statuses' => SupplyRequest::STATUSES,
            // L'enseignant ne voit pas les quantités en stock : seulement ce qui est au catalogue.
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
            'classes' => $this->classes($request)->get(['school_classes.id', 'school_classes.name']),
        ]);
    }

    public function store(Request $request)
    {
        $allowed = $this->classes($request)->pluck('school_classes.id')->all();

        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'school_class_id' => ['nullable', Rule::in($allowed)],
            'needed_at' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1', 'max:30'],
            'lines.*.product_id' => ['required', Rule::exists('products', 'id')->where('is_active', true), 'distinct'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0', 'max:100000'],
        ], ['lines.required' => 'Ajoutez au moins un article.', 'lines.min' => 'Ajoutez au moins un article.']);

        $supplyRequest = SupplyRequest::create([
            'purpose' => $data['purpose'],
            'school_class_id' => $data['school_class_id'] ?? null,
            'needed_at' => $data['needed_at'] ?? null,
            'notes' => $data['notes'] ?? null,
            'requested_by' => $request->user()->id,
        ]);
        $supplyRequest->lines()->createMany($data['lines']);

        foreach (User::permission('modifier_stocks')->get() as $keeper) {
            SafePush::send($keeper, 'Demande de matériel', "{$supplyRequest->purpose} · {$request->user()->name}", route('admin.supply-requests.show', $supplyRequest, false));
        }

        return back()->with('success', 'Demande '.$supplyRequest->number.' envoyée à l\'économat.');
    }

    public function cancel(Request $request, SupplyRequest $supplyRequest)
    {
        abort_unless($supplyRequest->requested_by === $request->user()->id, 403);

        if ($supplyRequest->status !== 'en_attente') {
            throw ValidationException::withMessages(['status' => 'Seule une demande en attente peut être annulée.']);
        }

        $supplyRequest->delete();

        return back()->with('success', 'Demande annulée.');
    }

    /** Les classes de l'enseignant (celles qui lui sont affectées). */
    private function classes(Request $request)
    {
        $teacher = $request->user()->teacher;

        return \App\Models\SchoolClass::query()
            ->when($teacher, fn ($q) => $q->whereIn('school_classes.id', $teacher->schoolClasses()->pluck('school_classes.id')), fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('school_classes.name');
    }
}

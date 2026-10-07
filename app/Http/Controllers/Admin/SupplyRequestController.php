<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SchoolClass;
use App\Models\SupplyRequest;
use App\Services\Economat;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SupplyRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SupplyRequest::with('requester:id,name', 'schoolClass:id,name')->withCount('lines');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return Inertia::render('Admin/SupplyRequests/Index', [
            'requests' => $query->latest('id')->paginate(15)->withQueryString()->through(fn (SupplyRequest $r) => [
                'id' => $r->id, 'number' => $r->number, 'status' => $r->status, 'purpose' => $r->purpose,
                'requester' => $r->requester?->name, 'class' => $r->schoolClass?->name,
                'needed_at' => $r->needed_at?->toDateString(), 'lines' => $r->lines_count,
                'created_at' => $r->created_at->toDateString(),
            ]),
            'counts' => SupplyRequest::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
            'statuses' => SupplyRequest::STATUSES,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/SupplyRequests/Form', [
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'quantity_in_stock']),
            'classes' => SchoolClass::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'needed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id', 'distinct'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ], ['lines.required' => 'Ajoutez au moins un article.', 'lines.min' => 'Ajoutez au moins un article.']);

        $supplyRequest = SupplyRequest::create([
            'purpose' => $data['purpose'],
            'school_class_id' => $data['school_class_id'] ?? null,
            'needed_at' => $data['needed_at'] ?? null,
            'notes' => $data['notes'] ?? null,
            'requested_by' => $request->user()->id,
        ]);
        $supplyRequest->lines()->createMany($data['lines']);

        return redirect()->route('admin.supply-requests.show', $supplyRequest)->with('success', 'Demande '.$supplyRequest->number.' enregistrée.');
    }

    public function show(SupplyRequest $supplyRequest): Response
    {
        $supplyRequest->load('requester:id,name', 'schoolClass:id,name', 'lines.product:id,name,unit,quantity_in_stock');

        return Inertia::render('Admin/SupplyRequests/Show', [
            'supplyRequest' => [
                'id' => $supplyRequest->id, 'number' => $supplyRequest->number, 'status' => $supplyRequest->status,
                'purpose' => $supplyRequest->purpose, 'notes' => $supplyRequest->notes,
                'requester' => $supplyRequest->requester?->name, 'class' => $supplyRequest->schoolClass?->name,
                'needed_at' => $supplyRequest->needed_at?->toDateString(),
                'reviewed_at' => $supplyRequest->reviewed_at?->toIso8601String(), 'delivered_at' => $supplyRequest->delivered_at?->toIso8601String(),
                'lines' => $supplyRequest->lines->map(fn ($l) => [
                    'id' => $l->id, 'product' => $l->product->name, 'unit' => $l->product->unit,
                    'quantity' => (float) $l->quantity, 'stock' => (float) $l->product->quantity_in_stock,
                    'enough' => (float) $l->product->quantity_in_stock + 0.001 >= (float) $l->quantity,
                ])->values(),
            ],
            'statuses' => SupplyRequest::STATUSES,
        ]);
    }

    public function approve(Request $request, SupplyRequest $supplyRequest)
    {
        $this->mustBePending($supplyRequest);
        $supplyRequest->update(['status' => 'approuvee', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        return back()->with('success', 'Demande approuvée.');
    }

    public function refuse(Request $request, SupplyRequest $supplyRequest)
    {
        $this->mustBePending($supplyRequest);
        $supplyRequest->update(['status' => 'refusee', 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        return back()->with('success', 'Demande refusée.');
    }

    public function deliver(Request $request, SupplyRequest $supplyRequest, Economat $economat)
    {
        $economat->deliver($supplyRequest, $request->user());

        return back()->with('success', 'Matériel livré : le stock est à jour.');
    }

    private function mustBePending(SupplyRequest $supplyRequest): void
    {
        if ($supplyRequest->status !== 'en_attente') {
            throw ValidationException::withMessages(['status' => 'Cette demande a déjà été traitée.']);
        }
    }
}

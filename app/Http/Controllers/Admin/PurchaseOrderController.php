<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Services\Economat;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PurchaseOrder::with('supplier:id,name', 'lines');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        $orders = $query->latest('id')->paginate(15)->withQueryString();
        $orders->getCollection()->transform(fn (PurchaseOrder $o) => [
            'id' => $o->id, 'number' => $o->number, 'supplier' => $o->supplier->name, 'status' => $o->status,
            'ordered_at' => $o->ordered_at?->toDateString(), 'expected_at' => $o->expected_at?->toDateString(),
            'late' => $o->isOpen() && $o->expected_at?->isPast(),
            'total' => $o->total, 'received' => $o->received_total, 'lines' => $o->lines->count(),
        ]);

        return Inertia::render('Admin/PurchaseOrders/Index', [
            'orders' => $orders,
            'counts' => PurchaseOrder::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'statuses' => PurchaseOrder::STATUSES,
            'filters' => $request->only(['status', 'supplier_id']),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Admin/PurchaseOrders/Form', [
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'unit_cost', 'supplier_id', 'quantity_in_stock', 'min_threshold']),
            'supplierId' => $request->integer('supplier_id') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'expected_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id', 'distinct'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ], ['lines.required' => 'Ajoutez au moins un article.', 'lines.min' => 'Ajoutez au moins un article.']);

        $order = PurchaseOrder::create([
            'supplier_id' => $data['supplier_id'],
            'expected_at' => $data['expected_at'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);
        $order->lines()->createMany($data['lines']);

        return redirect()->route('admin.purchase-orders.show', $order)->with('success', 'Bon de commande '.$order->number.' créé.');
    }

    public function show(PurchaseOrder $purchaseOrder): Response
    {
        $purchaseOrder->load('supplier', 'lines.product:id,name,unit', 'creator:id,name', 'expense:id,amount');

        return Inertia::render('Admin/PurchaseOrders/Show', [
            'order' => [
                'id' => $purchaseOrder->id, 'number' => $purchaseOrder->number, 'status' => $purchaseOrder->status,
                'supplier' => $purchaseOrder->supplier->only(['id', 'name', 'contact_name', 'phone', 'email']),
                'ordered_at' => $purchaseOrder->ordered_at?->toDateString(), 'expected_at' => $purchaseOrder->expected_at?->toDateString(),
                'received_at' => $purchaseOrder->received_at?->toDateString(), 'notes' => $purchaseOrder->notes,
                'creator' => $purchaseOrder->creator?->name, 'total' => $purchaseOrder->total, 'received_total' => $purchaseOrder->received_total,
                'expense' => $purchaseOrder->expense ? ['id' => $purchaseOrder->expense->id, 'amount' => (float) $purchaseOrder->expense->amount] : null,
                'lines' => $purchaseOrder->lines->map(fn ($l) => [
                    'id' => $l->id, 'product' => $l->product->name, 'unit' => $l->product->unit,
                    'quantity' => (float) $l->quantity, 'unit_cost' => (float) $l->unit_cost,
                    'received' => (float) $l->received_quantity, 'remaining' => $l->remaining,
                ])->values(),
            ],
            'statuses' => PurchaseOrder::STATUSES,
        ]);
    }

    public function send(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'brouillon') {
            throw ValidationException::withMessages(['status' => 'Seul un brouillon peut être envoyé.']);
        }

        $purchaseOrder->update(['status' => 'envoye', 'ordered_at' => today()]);

        return back()->with('success', 'Bon de commande marqué comme envoyé au fournisseur.');
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder, Economat $economat)
    {
        $data = $request->validate(['received' => ['required', 'array'], 'received.*' => ['nullable', 'numeric', 'min:0']]);

        $economat->receive($purchaseOrder, $data['received'], $request->user());

        return back()->with('success', 'Réception enregistrée : le stock est à jour.');
    }

    public function expense(Request $request, PurchaseOrder $purchaseOrder, Economat $economat)
    {
        $data = $request->validate(['payment_method' => ['required', 'in:especes,virement,mobile_money,autre']]);

        $economat->recordExpense($purchaseOrder, $data['payment_method'], $request->user());

        return back()->with('success', 'Dépense enregistrée en comptabilité.');
    }

    public function cancel(PurchaseOrder $purchaseOrder)
    {
        if (! in_array($purchaseOrder->status, ['brouillon', 'envoye'], true)) {
            throw ValidationException::withMessages(['status' => "Un bon déjà réceptionné ne peut plus être annulé."]);
        }

        $purchaseOrder->update(['status' => 'annule']);

        return back()->with('success', 'Bon de commande annulé.');
    }

    public function pdf(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load('supplier', 'lines.product:id,name,unit');

        return Pdf::loadView('pdf.purchase-order', ['order' => $purchaseOrder])->download($purchaseOrder->number.'.pdf');
    }
}

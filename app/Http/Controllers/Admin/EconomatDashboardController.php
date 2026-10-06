<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\SupplyRequest;
use Inertia\Inertia;
use Inertia\Response;

class EconomatDashboardController extends Controller
{
    public function index(): Response
    {
        $active = Product::where('is_active', true);
        $low = (clone $active)->whereColumn('quantity_in_stock', '<=', 'min_threshold')->where('quantity_in_stock', '>', 0);
        $empty = (clone $active)->where('quantity_in_stock', '<=', 0);

        $byCategory = Product::selectRaw('category, COUNT(*) as items, COALESCE(SUM(quantity_in_stock * unit_cost), 0) as value')
            ->groupBy('category')->get()
            ->map(fn ($row) => ['label' => Product::CATEGORIES[$row->category] ?? $row->category, 'items' => (int) $row->items, 'value' => round((float) $row->value, 2)])
            ->sortByDesc('value')->values();

        $openOrders = PurchaseOrder::with('supplier:id,name', 'lines')->whereIn('status', ['envoye', 'partiel'])->orderBy('expected_at')->get();
        $pending = SupplyRequest::with('requester:id,name', 'schoolClass:id,name')->whereIn('status', ['en_attente', 'approuvee'])->orderBy('needed_at')->limit(6)->get();

        return Inertia::render('Admin/Economat/Dashboard', [
            'kpis' => [
                'stockValue' => round((float) Product::selectRaw('COALESCE(SUM(quantity_in_stock * unit_cost), 0) as v')->value('v'), 2),
                'items' => Product::count(),
                'low' => (clone $low)->count(),
                'empty' => (clone $empty)->count(),
                'ordersOpen' => $openOrders->count(),
                'ordersValue' => round($openOrders->sum(fn ($o) => $o->total - $o->received_total), 2),
                'requestsPending' => SupplyRequest::where('status', 'en_attente')->count(),
                'requestsToDeliver' => SupplyRequest::where('status', 'approuvee')->count(),
            ],
            'toReorder' => (clone $active)->whereColumn('quantity_in_stock', '<=', 'min_threshold')->with('supplier:id,name')
                ->orderByRaw('quantity_in_stock - min_threshold')->limit(8)
                ->get(['id', 'name', 'unit', 'quantity_in_stock', 'min_threshold', 'supplier_id']),
            'byCategory' => $byCategory,
            'openOrders' => $openOrders->take(5)->map(fn (PurchaseOrder $o) => [
                'id' => $o->id, 'number' => $o->number, 'supplier' => $o->supplier->name, 'status' => $o->status,
                'expected_at' => $o->expected_at?->toDateString(), 'late' => $o->expected_at?->isPast() ?? false,
                'total' => $o->total,
            ])->values(),
            'pendingRequests' => $pending->map(fn (SupplyRequest $r) => [
                'id' => $r->id, 'number' => $r->number, 'status' => $r->status, 'purpose' => $r->purpose,
                'requester' => $r->requester?->name, 'class' => $r->schoolClass?->name, 'needed_at' => $r->needed_at?->toDateString(),
            ])->values(),
            'movements' => StockMovement::with('product:id,name,unit')->latest('id')->limit(8)->get()
                ->map(fn (StockMovement $m) => [
                    'id' => $m->id, 'product' => $m->product?->name, 'unit' => $m->product?->unit, 'type' => $m->type,
                    'quantity' => (float) $m->quantity, 'reason' => $m->reason, 'date' => $m->movement_date?->toDateString(),
                ]),
            'statuses' => ['orders' => PurchaseOrder::STATUSES, 'requests' => SupplyRequest::STATUSES],
        ]);
    }
}

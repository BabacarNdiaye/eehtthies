<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Economat;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Product::where('is_active', true)->orderBy('category')->orderBy('name');

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        return Inertia::render('Admin/Inventory/Index', [
            'products' => $query->get(['id', 'name', 'category', 'unit', 'quantity_in_stock', 'unit_cost']),
            'categories' => Product::CATEGORIES,
            'filters' => $request->only(['category']),
        ]);
    }

    public function store(Request $request, Economat $economat)
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'counted' => ['required', 'array'],
            'counted.*' => ['nullable', 'numeric', 'min:0'],
        ]);

        $changes = $economat->applyInventory($data['counted'], $request->user(), $data['label'] ?? null);

        return back()->with('success', $changes === 0 ? "Aucun écart : le stock correspond à l'inventaire." : "{$changes} écart(s) régularisé(s) dans le stock.");
    }
}

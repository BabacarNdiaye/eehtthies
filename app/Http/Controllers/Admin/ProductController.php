<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Product::with('supplier:id,name');

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        if ($request->filled('low_stock')) {
            $query->whereColumn('quantity_in_stock', '<=', 'min_threshold');
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->string('search').'%');
        }

        return Inertia::render('Admin/Products/Index', [
            'products' => $query->orderBy('name')->paginate(15)->withQueryString(),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => Product::CATEGORIES,
            'filters' => $request->only(['category', 'low_stock', 'search']),
            'lowStockCount' => Product::whereColumn('quantity_in_stock', '<=', 'min_threshold')->where('is_active', true)->count(),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?Product $product = null): Response
    {
        return Inertia::render('Admin/Products/Form', [
            'product' => $product,
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => Product::CATEGORIES,
        ]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:'.implode(',', array_keys(Product::CATEGORIES))],
            'unit' => ['required', 'string', 'max:50'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'min_threshold' => ['required', 'numeric', 'min:0'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'is_active' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        Product::create($request->validate($this->rules()));

        return redirect()->route('admin.products.index')->with('success', 'Produit créé avec succès.');
    }

    public function edit(Product $product): Response
    {
        return $this->formResponse($product);
    }

    public function update(Request $request, Product $product)
    {
        $product->update($request->validate($this->rules()));

        return redirect()->route('admin.products.index')->with('success', 'Produit mis à jour avec succès.');
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return back()->with('success', 'Produit supprimé.');
    }

    public function movements(Request $request): Response
    {
        $query = StockMovement::with('product:id,name,unit', 'recordedBy:id,name');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        return Inertia::render('Admin/Products/Movements', [
            'movements' => $query->latest('movement_date')->latest('id')->paginate(20)->withQueryString(),
            'products' => Product::orderBy('name')->get(['id', 'name']),
            'types' => StockMovement::TYPES,
            'filters' => $request->only(['product_id', 'type']),
        ]);
    }

    public function storeMovement(Request $request, Product $product)
    {
        $data = $request->validate([
            'type' => ['required', 'in:entree,sortie,ajustement'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:255'],
            'movement_date' => ['required', 'date'],
        ]);

        if ($data['type'] === 'sortie' && $data['quantity'] > (float) $product->quantity_in_stock) {
            throw ValidationException::withMessages([
                'quantity' => 'La quantité sortie dépasse le stock disponible ('.$product->quantity_in_stock.' '.$product->unit.').',
            ]);
        }

        $product->movements()->create([
            ...$data,
            'recorded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Mouvement de stock enregistré avec succès.');
    }
}

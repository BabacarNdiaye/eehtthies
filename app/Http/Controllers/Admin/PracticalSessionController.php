<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PracticalSession;
use App\Models\PracticalSessionItem;
use App\Models\Product;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PracticalSessionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/PracticalSessions/Index', [
            'sessions' => PracticalSession::with('schoolClass:id,name', 'subject:id,name', 'teacher:id,first_name,last_name')
                ->withCount('items')
                ->latest('session_date')
                ->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?PracticalSession $session = null): Response
    {
        return Inertia::render('Admin/PracticalSessions/Form', [
            'session' => $session?->load('items.product:id,name,unit,unit_cost', 'schoolClass', 'subject', 'teacher'),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'teachers' => Teacher::orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'unit_cost', 'quantity_in_stock']),
        ]);
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'session_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function store(Request $request)
    {
        $session = PracticalSession::create($request->validate($this->rules()));

        return redirect()->route('admin.practical-sessions.edit', $session)
            ->with('success', 'Séance créée avec succès. Ajoutez les produits consommés ci-dessous.');
    }

    public function edit(PracticalSession $practicalSession): Response
    {
        return $this->formResponse($practicalSession);
    }

    public function update(Request $request, PracticalSession $practicalSession)
    {
        $practicalSession->update($request->validate($this->rules()));

        return back()->with('success', 'Séance mise à jour avec succès.');
    }

    public function destroy(PracticalSession $practicalSession)
    {
        $practicalSession->delete();

        return redirect()->route('admin.practical-sessions.index')->with('success', 'Séance supprimée.');
    }

    public function storeItem(Request $request, PracticalSession $practicalSession)
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity_used' => ['required', 'numeric', 'min:0.01'],
        ]);

        $product = Product::findOrFail($data['product_id']);

        if ($data['quantity_used'] > (float) $product->quantity_in_stock) {
            throw ValidationException::withMessages([
                'quantity_used' => 'La quantité demandée dépasse le stock disponible ('.$product->quantity_in_stock.' '.$product->unit.').',
            ]);
        }

        $practicalSession->items()->create([
            'product_id' => $product->id,
            'quantity_used' => $data['quantity_used'],
            'unit_cost_at_time' => $product->unit_cost,
        ]);

        $product->movements()->create([
            'type' => 'sortie',
            'quantity' => $data['quantity_used'],
            'reason' => "Atelier pratique — {$practicalSession->title}",
            'movement_date' => $practicalSession->session_date,
            'recorded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Produit ajouté à la séance et sorti du stock.');
    }

    public function destroyItem(Request $request, PracticalSession $practicalSession, PracticalSessionItem $item)
    {
        abort_unless($item->practical_session_id === $practicalSession->id, 404);

        // Restitue la quantité de stock qui avait été consommée pour cet article.
        $product = $item->product;
        $product->movements()->create([
            'type' => 'entree',
            'quantity' => $item->quantity_used,
            'unit_cost' => $item->unit_cost_at_time,
            'reason' => "Annulation — {$practicalSession->title}",
            'movement_date' => now(),
            'recorded_by' => $request->user()->id,
        ]);

        $item->delete();

        return back()->with('success', 'Produit retiré de la séance et stock restitué.');
    }
}

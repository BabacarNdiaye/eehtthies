<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FaqController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Faq/Index', [
            'faqs' => Faq::orderBy('category')->orderBy('order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Faq/Form');
    }

    private function rules(): array
    {
        return [
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'order' => ['nullable', 'integer'],
            'is_published' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        Faq::create($request->validate($this->rules()));

        return redirect()->route('admin.faqs.index')->with('success', 'Question ajoutée avec succès.');
    }

    public function edit(Faq $faq): Response
    {
        return Inertia::render('Admin/Faq/Form', ['faq' => $faq]);
    }

    public function update(Request $request, Faq $faq)
    {
        $faq->update($request->validate($this->rules()));

        return redirect()->route('admin.faqs.index')->with('success', 'Question mise à jour avec succès.');
    }

    public function destroy(Faq $faq)
    {
        $faq->delete();

        return back()->with('success', 'Question supprimée.');
    }
}

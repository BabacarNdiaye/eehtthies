<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EventItem;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Events/Index', [
            'events' => EventItem::orderByDesc('start_at')->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Events/Form');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'start_at' => ['required', 'date'],
            'end_at' => ['nullable', 'date', 'after_or_equal:start_at'],
            'is_published' => ['boolean'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['slug'] = Str::slug($data['title']).'-'.Str::random(5);

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'events');
        }

        EventItem::create($data);

        return redirect()->route('admin.events.index')->with('success', 'Événement créé avec succès.');
    }

    public function edit(EventItem $event): Response
    {
        return Inertia::render('Admin/Events/Form', ['event' => $event]);
    }

    public function update(Request $request, EventItem $event)
    {
        $data = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'events');
        } else {
            unset($data['image']);
        }

        $event->update($data);

        return redirect()->route('admin.events.index')->with('success', 'Événement mis à jour avec succès.');
    }

    public function destroy(EventItem $event)
    {
        $event->delete();

        return back()->with('success', 'Événement supprimé.');
    }
}

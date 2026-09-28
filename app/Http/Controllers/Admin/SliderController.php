<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Slider;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SliderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Sliders/Index', [
            'sliders' => Slider::orderBy('order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Sliders/Form');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'image', 'max:5120'],
            'button_text' => ['nullable', 'string', 'max:100'],
            'button_link' => ['nullable', 'string', 'max:255'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'sliders', 1920);
        }

        Slider::create($data);

        return redirect()->route('admin.sliders.index')->with('success', 'Slide ajoutée avec succès.');
    }

    public function edit(Slider $slider): Response
    {
        return Inertia::render('Admin/Sliders/Form', ['slider' => $slider]);
    }

    public function update(Request $request, Slider $slider)
    {
        $data = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'sliders', 1920);
        } else {
            unset($data['image']);
        }

        $slider->update($data);

        return redirect()->route('admin.sliders.index')->with('success', 'Slide mise à jour avec succès.');
    }

    public function destroy(Slider $slider)
    {
        $slider->delete();

        return back()->with('success', 'Slide supprimée.');
    }
}

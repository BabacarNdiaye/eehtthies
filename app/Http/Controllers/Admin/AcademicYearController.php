<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AcademicYearController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/AcademicYears/Index', [
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(),
        ]);
    }

    private function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        if (! empty($data['is_current'])) {
            AcademicYear::query()->update(['is_current' => false]);
        }

        AcademicYear::create($data);

        return back()->with('success', 'Année académique ajoutée avec succès.');
    }

    public function update(Request $request, AcademicYear $academicYear)
    {
        $data = $request->validate($this->rules());

        if (! empty($data['is_current'])) {
            AcademicYear::query()->where('id', '!=', $academicYear->id)->update(['is_current' => false]);
        }

        $academicYear->update($data);

        return back()->with('success', 'Année académique mise à jour avec succès.');
    }

    public function destroy(AcademicYear $academicYear)
    {
        $academicYear->delete();

        return back()->with('success', 'Année académique supprimée.');
    }
}

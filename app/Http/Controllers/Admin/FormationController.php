<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Support\CouncilGuards;
use App\Support\Exportable;
use App\Support\ImageOptimizer;
use App\Support\ReadsCsv;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FormationController extends Controller
{
    use Exportable, ReadsCsv;

    public function importTemplate()
    {
        $columns = ['name', 'code', 'diploma', 'level', 'duration', 'registration_fee', 'tuition_fee', 'capacity', 'description'];

        return $this->csvResponse('modele-import-formations.csv', array_map(fn ($c) => ['key' => $c, 'label' => $c], $columns), [
            ['name' => 'Cuisine professionnelle', 'code' => 'CUI', 'diploma' => 'CAP', 'level' => 'Niveau 3', 'duration' => '2 ans', 'registration_fee' => '25000', 'tuition_fee' => '150000', 'capacity' => '30', 'description' => ''],
        ]);
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt']]);

        $rows = $this->readCsvRows($request->file('file'));

        if ($rows === null) {
            return back()->with('error', 'Fichier CSV vide ou illisible.');
        }

        $created = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $name = $row['name'] ?? '';
            $code = $row['code'] ?? '';

            if ($name === '' || $code === '' || Formation::where('code', $code)->exists()) {
                $skipped++;

                continue;
            }

            $slug = Str::slug($name);
            if (Formation::where('slug', $slug)->exists()) {
                $slug = Str::slug("{$name} {$code}");
            }

            Formation::create([
                'name' => $name,
                'code' => $code,
                'slug' => $slug,
                'diploma' => ($row['diploma'] ?? '') ?: null,
                'level' => ($row['level'] ?? '') ?: null,
                'duration' => ($row['duration'] ?? '') ?: null,
                'registration_fee' => is_numeric($row['registration_fee'] ?? null) ? $row['registration_fee'] : 0,
                'tuition_fee' => is_numeric($row['tuition_fee'] ?? null) ? $row['tuition_fee'] : 0,
                'capacity' => ctype_digit($row['capacity'] ?? '') && ($row['capacity'] ?? '') !== '' ? (int) $row['capacity'] : null,
                'description' => ($row['description'] ?? '') ?: null,
            ]);
            $created++;
        }

        return back()->with('success', "{$created} formation(s) importée(s). {$skipped} ligne(s) ignorée(s).");
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Formation/Index', [
            'formations' => Formation::withCount('students')->orderBy('order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Formation/Form');
    }

    private function rules(?Formation $formation = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:formations,code'.($formation ? ",{$formation->id}" : '')],
            'diploma' => ['nullable', 'string', 'max:100'],
            'diploma_recognition' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:100'],
            'duration' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'admission_conditions' => ['nullable', 'string'],
            'registration_fee' => ['nullable', 'numeric', 'min:0'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'program' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'career_prospects' => ['nullable', 'string'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'next_intake_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'order' => ['nullable', 'integer'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'formations');
        }

        Formation::create($data);

        return redirect()->route('admin.formations.index')->with('success', 'Formation créée avec succès.');
    }

    public function edit(Formation $formation): Response
    {
        return Inertia::render('Admin/Formation/Form', [
            'formation' => $formation,
        ]);
    }

    public function update(Request $request, Formation $formation)
    {
        $data = $request->validate($this->rules($formation));
        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'formations');
        } else {
            unset($data['image']);
        }

        $formation->update($data);

        return redirect()->route('admin.formations.index')->with('success', 'Formation mise à jour avec succès.');
    }

    public function destroy(Formation $formation)
    {
        if ($reason = CouncilGuards::reason($formation)) {
            return back()->with('error', $reason);
        }

        $formation->delete();

        return back()->with('success', 'Formation supprimée.');
    }
}

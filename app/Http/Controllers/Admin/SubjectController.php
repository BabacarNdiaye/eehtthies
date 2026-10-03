<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Subject;
use App\Support\Exportable;
use App\Support\ReadsCsv;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    use Exportable, ReadsCsv;

    public function importTemplate()
    {
        return $this->csvResponse('modele-import-matieres.csv', array_map(fn ($c) => ['key' => $c, 'label' => $c], ['name', 'code', 'formation', 'coefficient']), [
            ['name' => 'Hygiène et sécurité', 'code' => 'HYG', 'formation' => 'CUI', 'coefficient' => '2'],
        ]);
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt']]);

        $rows = $this->readCsvRows($request->file('file'));

        if ($rows === null) {
            return back()->with('error', 'Fichier CSV vide ou illisible.');
        }

        $formations = Formation::get(['id', 'name', 'code']);
        $created = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $name = $row['name'] ?? '';
            $formationId = null;

            if (($row['formation'] ?? '') !== '') {
                $wanted = mb_strtolower($row['formation']);
                $formationId = $formations->first(fn ($f) => mb_strtolower($f->code) === $wanted || mb_strtolower($f->name) === $wanted)?->id;

                if ($formationId === null) {
                    $skipped++;

                    continue;
                }
            }

            if ($name === '' || Subject::where('name', $name)->where('formation_id', $formationId)->exists()) {
                $skipped++;

                continue;
            }

            Subject::create([
                'name' => $name,
                'code' => ($row['code'] ?? '') ?: null,
                'formation_id' => $formationId,
                'coefficient' => is_numeric($row['coefficient'] ?? null) ? $row['coefficient'] : 1,
            ]);
            $created++;
        }

        return back()->with('success', "{$created} matière(s) importée(s). {$skipped} ligne(s) ignorée(s).");
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Subjects/Index', [
            'subjects' => Subject::with('formation:id,name')->latest()->get(),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'formation_id' => ['nullable', 'exists:formations,id'],
            'coefficient' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function store(Request $request)
    {
        Subject::create($request->validate($this->rules()));

        return back()->with('success', 'Matière créée avec succès.');
    }

    public function update(Request $request, Subject $subject)
    {
        $subject->update($request->validate($this->rules()));

        return back()->with('success', 'Matière mise à jour avec succès.');
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();

        return back()->with('success', 'Matière supprimée.');
    }
}

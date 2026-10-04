<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidature;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Recherche globale de l'administration (palette Ctrl/⌘ K) : élèves, enseignants, candidatures et factures.
 *
 * Chaque famille n'est interrogée que si le rôle peut ouvrir la liste correspondante (voir_eleves,
 * voir_enseignants, voir_candidatures, voir_comptabilite) : on ne renvoie jamais une fiche que la liste ne montrerait
 * pas. Lecture seule, 5 résultats par famille, 2 caractères au moins. Les mots tapés doivent tous se retrouver
 * (dans n'importe quel ordre) ; « % » et « _ » sont des caractères comme les autres.
 */
class SearchController extends Controller
{
    private const MIN_LENGTH = 2;

    private const MAX_LENGTH = 60;

    private const LIMIT = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = trim(mb_substr((string) $request->query('q', ''), 0, self::MAX_LENGTH));
        $results = ['students' => [], 'teachers' => [], 'candidatures' => [], 'invoices' => []];

        if (mb_strlen($query) < self::MIN_LENGTH) {
            return response()->json($results);
        }

        $terms = preg_split('/\s+/u', $query, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($user->can('voir_eleves')) {
            $results['students'] = $this->students($terms);
        }

        if ($user->can('voir_enseignants')) {
            $results['teachers'] = $this->teachers($terms);
        }

        if ($user->can('voir_candidatures')) {
            $results['candidatures'] = $this->candidatures($terms);
        }

        if ($user->can('voir_comptabilite')) {
            $results['invoices'] = $this->invoices($terms);
        }

        return response()->json($results);
    }

    /** @param  list<string>  $terms */
    private function students(array $terms): array
    {
        return $this->whereEveryTerm(Student::query()->with('schoolClass:id,name'), $terms, ['first_name', 'last_name', 'matricule'])
            ->orderBy('last_name')->orderBy('first_name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'label' => $student->full_name,
                'hint' => $this->hint([$student->matricule, $student->schoolClass?->name]),
                'href' => route('admin.students.edit', $student->id, false),
            ])->all();
    }

    /** @param  list<string>  $terms */
    private function teachers(array $terms): array
    {
        return $this->whereEveryTerm(Teacher::query(), $terms, ['first_name', 'last_name', 'matricule'])
            ->orderBy('last_name')->orderBy('first_name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'label' => $teacher->full_name,
                'hint' => $this->hint([$teacher->matricule, $teacher->specialty]),
                'href' => route('admin.teachers.edit', $teacher->id, false),
            ])->all();
    }

    /** @param  list<string>  $terms */
    private function candidatures(array $terms): array
    {
        return $this->whereEveryTerm(Candidature::query()->with('formation:id,name'), $terms, ['first_name', 'last_name', 'reference', 'email'])
            ->latest('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Candidature $candidature) => [
                'id' => $candidature->id,
                'label' => $candidature->full_name,
                'hint' => $this->hint([$candidature->reference, $candidature->formation?->name]),
                'href' => route('admin.candidatures.show', $candidature->id, false),
            ])->all();
    }

    /** @param  list<string>  $terms */
    private function invoices(array $terms): array
    {
        $query = Invoice::query()->with('student:id,first_name,last_name');

        foreach ($terms as $term) {
            $query->where(function (Builder $where) use ($term) {
                $this->orLike($where, ['reference', 'label'], $term);
                $where->orWhereHas('student', fn (Builder $student) => $this->orLike($student, ['first_name', 'last_name', 'matricule'], $term));
            });
        }

        return $query->latest('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'label' => $invoice->reference,
                'hint' => $this->hint([$invoice->student?->full_name, $invoice->label]),
                'href' => route('admin.invoices.show', $invoice->id, false),
            ])->all();
    }

    /**
     * Chaque mot tapé doit se retrouver dans au moins une des colonnes : « diop awa » et « awa diop » ramènent
     * donc le même élève.
     *
     * @param  list<string>  $terms
     * @param  list<string>  $columns
     */
    private function whereEveryTerm(Builder $query, array $terms, array $columns): Builder
    {
        foreach ($terms as $term) {
            $query->where(fn (Builder $where) => $this->orLike($where, $columns, $term));
        }

        return $query;
    }

    /**
     * « colonne LIKE %mot% » pour chaque colonne, reliées par OU. Le mot est protégé : « % » et « _ » n'y sont plus des
     * jokers. Le caractère d'échappement est déclaré (ESCAPE '!') car MySQL et SQLite n'ont pas le même par défaut.
     *
     * @param  list<string>  $columns
     */
    private function orLike(Builder $query, array $columns, string $term): void
    {
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $grammar = $query->getQuery()->getGrammar();

        foreach ($columns as $column) {
            $query->orWhereRaw($grammar->wrap($column)." LIKE ? ESCAPE '!'", [$pattern]);
        }
    }

    /** @param  array<int, string|null>  $parts */
    private function hint(array $parts): string
    {
        return implode(' · ', array_filter($parts, fn ($part) => filled($part)));
    }
}

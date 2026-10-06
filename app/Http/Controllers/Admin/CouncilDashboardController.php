<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Services\Council\CouncilDashboard;
use App\Support\Exportable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tableau de bord Direction des conseils de classe (E11). Réservé à la permission « voir » du module Conseils
 * (Direction) : Direction et responsable pédagogique par défaut.
 */
class CouncilDashboardController extends Controller
{
    use Exportable;

    public function __construct(private readonly CouncilDashboard $dashboard) {}

    public function index(Request $request): Response
    {
        $filters = $this->dashboard->filters($request);

        return Inertia::render('Admin/Councils/Dashboard', $this->dashboard->build($filters) + [
            'filters' => $filters,
            'years' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'classes' => SchoolClass::when($filters['academic_year_id'], fn ($query, int $id) => $query->where('academic_year_id', $id))
                ->when($filters['formation_id'], fn ($query, int $id) => $query->where('formation_id', $id))
                ->orderBy('name')->get(['id', 'name']),
            'terms' => config('eeht.council_terms'),
        ]);
    }

    /** DIR-04 : une ligne par conseil, avec les filtres de la page. */
    public function export(Request $request)
    {
        $rows = $this->dashboard->build($this->dashboard->filters($request))['councils'];
        $decimal = fn ($value) => $value === null ? '' : str_replace('.', ',', (string) $value);

        return $this->csvResponse('conseils-tableau-de-bord-'.now()->format('Y-m-d').'.csv', [
            ['key' => 'class', 'label' => 'Classe'],
            ['key' => 'formation', 'label' => 'Formation'],
            ['key' => 'year', 'label' => 'Année'],
            ['key' => 'term', 'label' => 'Période'],
            ['key' => 'status_label', 'label' => 'État'],
            ['key' => 'examined', 'label' => 'Élèves examinés'],
            ['key' => 'average', 'label' => 'Moyenne de classe'],
            ['key' => 'pass_rate', 'label' => 'Taux ≥ 10 (%)'],
            ['key' => 'red', 'label' => 'Attention'],
            ['key' => 'orange', 'label' => 'Vigilance'],
            ['key' => 'unjustified_hours', 'label' => 'Heures d’absence non justifiées'],
            ['key' => 'decisions', 'label' => 'Décisions'],
            ['key' => 'follow_ups', 'label' => 'Actions de suivi'],
            ['key' => 'follow_ups_done', 'label' => 'Actions réalisées'],
        ], collect($rows)->map(fn (array $row) => array_merge($row, [
            'average' => $decimal($row['average']),
            'pass_rate' => $decimal($row['pass_rate']),
            'unjustified_hours' => $decimal($row['unjustified_hours']),
        ])));
    }
}

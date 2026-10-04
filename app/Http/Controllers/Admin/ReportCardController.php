<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Services\ReportCardCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ReportCardController extends Controller
{
    public function index(Request $request): Response
    {
        $query = ReportCard::with(['student:id,first_name,last_name,matricule', 'schoolClass:id,name', 'academicYear:id,label']);

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->integer('school_class_id'));
        }

        if ($request->filled('term')) {
            $query->where('term', $request->string('term'));
        }

        return Inertia::render('Admin/ReportCards/Index', [
            'reportCards' => $query->orderByDesc('generated_at')->paginate(20)->withQueryString(),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'terms' => config('eeht.terms'),
            'decisions' => config('eeht.decision_labels'),
            'filters' => $request->only(['school_class_id', 'term']),
        ]);
    }

    public function generate(Request $request, ReportCardCalculator $calculator)
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'term' => ['required', 'string', 'max:100'],
        ]);

        $schoolClass = SchoolClass::findOrFail($data['school_class_id']);
        $academicYear = AcademicYear::findOrFail($data['academic_year_id']);
        $results = $calculator->computeForClass($schoolClass, $data['academic_year_id'], $data['term']);

        $isFinalTerm = $calculator->isFinalTerm($data['term']);
        $passAverage = $calculator->passAverageFor($schoolClass);
        $withAnnual = [];

        foreach ($results as $result) {
            $student = $result['student'];
            $previousAverage = $calculator->previousTermAverage($student, $data['academic_year_id'], $data['term']);
            $attendance = $calculator->attendanceStatsForTerm($student, $academicYear, $data['term']);

            // Moyenne annuelle = (semestre 1 + semestre 2) ÷ 2, au dernier semestre seulement.
            $annualAverage = $isFinalTerm ? $calculator->annualAverage([$previousAverage, $result['average']]) : null;

            // Au dernier semestre, c'est la moyenne annuelle qui décide du passage (et non celle du seul semestre) ;
            // avant, la moyenne du semestre donne une indication. Seuil : celui du niveau de la classe, 10/20 sinon.
            $decidingAverage = $isFinalTerm ? ($annualAverage ?? $result['average']) : $result['average'];

            $reportCard = ReportCard::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'academic_year_id' => $data['academic_year_id'],
                    'term' => $data['term'],
                ],
                [
                    'school_class_id' => $data['school_class_id'],
                    'average' => $result['average'],
                    'rank' => $result['rank'],
                    'class_size' => $result['class_size'],
                    'class_average' => $result['class_average'],
                    'previous_term_average' => $previousAverage,
                    'annual_average' => $annualAverage,
                    'decision' => $calculator->decisionFor($decidingAverage, $passAverage),
                    'mention' => $calculator->mentionFor($result['average']),
                    'retard_count' => $attendance['retard'],
                    'absence_count' => $attendance['absence'],
                    'unjustified_absence_count' => $attendance['unjustified'],
                    'generated_at' => now(),
                ]
            );

            if ($isFinalTerm && $annualAverage !== null) {
                $withAnnual[] = $reportCard;
            }
        }

        if ($isFinalTerm && count($withAnnual) > 0) {
            $sorted = collect($withAnnual)->sortByDesc('annual_average')->values();
            foreach ($sorted as $index => $reportCard) {
                $reportCard->update(['annual_rank' => $index + 1]);
            }
        }

        return back()->with('success', count($results).' bulletin(s) généré(s) avec succès.');
    }

    public function show(ReportCard $reportCard, ReportCardCalculator $calculator): Response
    {
        $breakdown = $calculator->computeDetailedForStudent(
            $reportCard->student,
            $reportCard->school_class_id,
            $reportCard->academic_year_id,
            $reportCard->term
        );

        return Inertia::render('Admin/ReportCards/Show', [
            'reportCard' => $reportCard->load('student', 'schoolClass', 'academicYear'),
            'subjects' => $breakdown['subjects'],
            'decisions' => config('eeht.decision_labels'),
            'mentions' => config('eeht.mention_labels'),
        ]);
    }

    public function update(Request $request, ReportCard $reportCard)
    {
        $data = $request->validate([
            'decision' => ['required', 'in:'.implode(',', array_keys(config('eeht.decision_labels')))],
            'mention' => ['nullable', 'in:'.implode(',', array_keys(config('eeht.mention_labels')))],
            'general_appreciation' => ['nullable', 'string', 'max:2000'],
        ]);

        $reportCard->update($data);

        return back()->with('success', 'Bulletin mis à jour avec succès.');
    }

    public function togglePublish(ReportCard $reportCard)
    {
        $reportCard->update(['is_published' => ! $reportCard->is_published]);

        return back()->with('success', $reportCard->is_published ? 'Bulletin publié.' : 'Bulletin dépublié.');
    }

    public function destroy(ReportCard $reportCard)
    {
        $reportCard->delete();

        return redirect()->route('admin.report-cards.index')->with('success', 'Bulletin supprimé.');
    }

    public function pdf(ReportCard $reportCard, ReportCardCalculator $calculator)
    {
        $pdf = $this->buildPdf($reportCard, $calculator);

        return $pdf->stream("bulletin-{$reportCard->student->matricule}-{$reportCard->term}.pdf");
    }

    /**
     * Télécharge en une seule archive ZIP tous les bulletins publiés
     * correspondant aux filtres (classe + trimestre), pour éviter de
     * télécharger les bulletins un par un.
     */
    public function exportZip(Request $request, ReportCardCalculator $calculator)
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'term' => ['required', 'string', 'max:100'],
        ]);

        $reportCards = ReportCard::with('student:id,first_name,last_name,matricule')
            ->where('school_class_id', $data['school_class_id'])
            ->where('term', $data['term'])
            ->where('is_published', true)
            ->get();

        abort_if($reportCards->isEmpty(), 404, 'Aucun bulletin publié pour cette sélection.');

        $schoolClass = SchoolClass::findOrFail($data['school_class_id']);
        $zipPath = tempnam(sys_get_temp_dir(), 'bulletins_').'.zip';

        $zip = new \ZipArchive;
        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $usedNames = [];
        foreach ($reportCards as $reportCard) {
            $pdf = $this->buildPdf($reportCard, $calculator);

            $name = "bulletin-{$reportCard->student->matricule}-{$reportCard->term}.pdf";
            $suffix = 1;
            while (in_array($name, $usedNames, true)) {
                $name = "bulletin-{$reportCard->student->matricule}-{$reportCard->term}-{$suffix}.pdf";
                $suffix++;
            }
            $usedNames[] = $name;

            $zip->addFromString($name, $pdf->output());
        }

        $zip->close();

        $filename = 'bulletins-'.preg_replace('/[^A-Za-z0-9-_]/', '_', $schoolClass->name).'-'.preg_replace('/[^A-Za-z0-9-_]/', '_', $data['term']).'.zip';

        return response()->download($zipPath, $filename)->deleteFileAfterSend();
    }

    private function buildPdf(ReportCard $reportCard, ReportCardCalculator $calculator)
    {
        $breakdown = $calculator->computeDetailedForStudent(
            $reportCard->student,
            $reportCard->school_class_id,
            $reportCard->academic_year_id,
            $reportCard->term
        );

        $verificationUrl = route('bulletins.verify', $reportCard->qr_token);
        $qrCode = base64_encode(QrCode::format('svg')->size(150)->generate($verificationUrl));

        return Pdf::loadView('pdf.bulletin', [
            'reportCard' => $reportCard->load('student', 'schoolClass.formation', 'academicYear'),
            'subjects' => $breakdown['subjects'],
            'qrCode' => $qrCode,
        ]);
    }
}

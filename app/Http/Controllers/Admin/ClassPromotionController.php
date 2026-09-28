<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentProgression;
use App\Services\ProgressionEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ClassPromotionController extends Controller
{
    // TEMPORARY guard — remove once the formation_levels/student_progressions
    // migrations have run on this environment (progression-engine deploy, 2026-09-28).
    private function engineMigrated(): bool
    {
        return Schema::hasTable('formation_levels')
            && Schema::hasColumn('school_classes', 'formation_level_id')
            && Schema::hasTable('student_progressions');
    }

    public function index(Request $request, ProgressionEngine $engine): Response
    {
        $migrated = $this->engineMigrated();

        $schoolClasses = SchoolClass::with(['formation:id,name', 'academicYear:id,label'])
            ->orderByDesc('academic_year_id')
            ->orderBy('name')
            ->get(['id', 'name', 'formation_id', 'academic_year_id']);

        $schoolClassId = $request->integer('school_class_id') ?: null;
        $sourceClass = null;
        $students = collect();

        if ($schoolClassId) {
            $sourceClass = SchoolClass::with(array_filter(['nextClass:id,name', $migrated ? 'formationLevel' : null]))->findOrFail($schoolClassId);

            $students = Student::where('school_class_id', $schoolClassId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name'])
                ->map(function (Student $student) use ($sourceClass, $engine, $migrated) {
                    $decision = ReportCard::where('student_id', $student->id)
                        ->where('academic_year_id', $sourceClass->academic_year_id)
                        ->orderByDesc('generated_at')
                        ->value('decision');

                    $suggestion = $migrated
                        ? $engine->suggest($student, $sourceClass)
                        : ['action' => 'undetermined', 'reasons' => [], 'target_class' => null];

                    return [
                        'id' => $student->id,
                        'matricule' => $student->matricule,
                        'first_name' => $student->first_name,
                        'last_name' => $student->last_name,
                        'decision' => $decision,
                        'suggestion' => [
                            'action' => $suggestion['action'],
                            'reasons' => $suggestion['reasons'],
                            'target_class_id' => $suggestion['target_class']?->id,
                        ],
                    ];
                })
                ->values();
        }

        return Inertia::render('Admin/ClassPromotion/Index', [
            'schoolClasses' => $schoolClasses,
            'sourceClass' => $sourceClass,
            'students' => $students,
            'decisions' => config('eeht.decision_labels'),
            'progressionDecisions' => StudentProgression::DECISIONS,
            'selectedClassId' => $schoolClassId,
            'isFinalLevel' => $migrated ? ($sourceClass?->formationLevel?->is_final_level ?? false) : false,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'assignments.*.action' => ['required', 'in:promote,stay,abandon,graduate,exclude'],
            'assignments.*.target_class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
        ]);

        $migrated = $this->engineMigrated();
        $counts = ['promote' => 0, 'stay' => 0, 'abandon' => 0, 'graduate' => 0, 'exclude' => 0];

        DB::transaction(function () use ($data, &$counts, $request, $migrated) {
            foreach ($data['assignments'] as $row) {
                $student = Student::findOrFail($row['student_id']);
                $sourceClass = $student->schoolClass;
                $decision = null;

                if ($row['action'] === 'abandon') {
                    $student->update(['status' => 'abandon']);
                    $decision = 'abandon';
                } elseif ($row['action'] === 'exclude') {
                    $student->update(['status' => 'exclu']);
                    $decision = 'exclu';
                } elseif ($row['action'] === 'graduate') {
                    abort_unless($student->formation, 422, "Cet élève n'a pas de formation associée.");
                    if ($student->formation->diploma_recognition === 'Attestation') {
                        $student->generateTrainingAttestationNumber();
                        $decision = 'certifie';
                    } else {
                        $student->generateDiplomaNumber();
                        $decision = 'diplome';
                    }
                    $student->update(['status' => 'diplome']);
                } else {
                    abort_if(empty($row['target_class_id']), 422, "Classe de destination manquante pour {$student->full_name}.");
                    $targetClass = SchoolClass::findOrFail($row['target_class_id']);

                    $student->update([
                        'school_class_id' => $targetClass->id,
                        'academic_year_id' => $targetClass->academic_year_id,
                        'is_repeating' => $row['action'] === 'stay',
                    ]);
                    $decision = $row['action'] === 'stay' ? 'redoublement' : 'passage';
                }

                if ($migrated && $sourceClass) {
                    StudentProgression::create([
                        'student_id' => $student->id,
                        'formation_level_id' => $sourceClass->formation_level_id,
                        'academic_year_id' => $sourceClass->academic_year_id,
                        'decision' => $decision,
                        'decided_by' => $request->user()->id,
                        'decided_at' => now(),
                    ]);
                }

                $counts[$row['action']]++;
            }
        });

        return back()->with('success', sprintf(
            '%d promu(s), %d redoublant(s), %d diplômé(s)/certifié(s), %d exclu(s), %d passé(s) en abandon.',
            $counts['promote'], $counts['stay'], $counts['graduate'], $counts['exclude'], $counts['abandon']
        ));
    }
}

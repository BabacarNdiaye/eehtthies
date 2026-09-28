<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Inertia\Inertia;
use Inertia\Response;

class DiplomaVerificationController extends Controller
{
    public function __invoke(string $diplomaNumber): Response
    {
        $student = Student::where('diploma_number', $diplomaNumber)
            ->where('status', 'diplome')
            ->with('formation')
            ->first();

        return Inertia::render('Public/DiplomaVerification', [
            'student' => $student ? [
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'matricule' => $student->matricule,
                'diploma_number' => $student->diploma_number,
                'diploma_issued_at' => $student->diploma_issued_at,
                'formation' => $student->formation ? [
                    'name' => $student->formation->name,
                    'diploma' => $student->formation->diploma,
                    'diploma_full_name' => $student->formation->diploma_full_name,
                    'specialty' => $student->formation->specialty,
                ] : null,
            ] : null,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Internship;
use App\Models\Student;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Un lieu unique et facile à trouver pour parcourir et télécharger les diplômes (Student::diplomaPdf) et
 * attestations de stage (Internship::attestationPdf) déjà générés ailleurs dans l'application.
 */
class CertificateController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Certificates/Index', [
            'diplomas' => Student::where('status', 'diplome')
                ->with('formation:id,name,diploma')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name', 'formation_id', 'diploma_number', 'diploma_issued_at']),
            'attestations' => Internship::where('status', 'termine')
                ->with('student:id,first_name,last_name,matricule', 'partner:id,name')
                ->orderByDesc('end_date')
                ->get(['id', 'student_id', 'partner_id', 'title', 'end_date', 'attestation_number']),
            'trainingAttestations' => Student::whereNotNull('training_attestation_number')
                ->with('formation:id,name,diploma')
                ->orderByDesc('training_attestation_issued_at')
                ->get(['id', 'matricule', 'first_name', 'last_name', 'formation_id', 'training_attestation_number', 'training_attestation_issued_at']),
        ]);
    }
}

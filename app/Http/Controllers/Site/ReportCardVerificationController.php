<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\ReportCard;
use Inertia\Inertia;
use Inertia\Response;

class ReportCardVerificationController extends Controller
{
    public function __invoke(string $token): Response
    {
        $reportCard = ReportCard::where('qr_token', $token)
            ->where('is_published', true)
            ->with(['student:id,first_name,last_name,matricule', 'schoolClass:id,name', 'academicYear:id,label'])
            ->first();

        return Inertia::render('Public/BulletinVerification', [
            'reportCard' => $reportCard,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Inertia\Inertia;
use Inertia\Response;

class AlumniController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Community/Alumni/Index', [
            'alumni' => Student::where('status', 'diplome')
                ->where('is_alumni_public', true)
                ->with('formation:id,name')
                ->orderByDesc('graduation_year')
                ->get([
                    'id', 'first_name', 'last_name', 'photo', 'formation_id', 'graduation_year',
                    'current_position', 'current_employer', 'linkedin_url', 'alumni_bio',
                ]),
        ]);
    }
}

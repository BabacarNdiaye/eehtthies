<?php

namespace Database\Seeders;

use App\Models\Internship;
use App\Models\InternshipOffer;
use App\Models\JobOffer;
use App\Models\Partner;
use App\Models\Student;
use Illuminate\Database\Seeder;

class CareerSeeder extends Seeder
{
    public function run(): void
    {
        $partners = Partner::all();
        if ($partners->isEmpty()) {
            return;
        }

        $offers = [
            ['title' => 'Stage cuisine — saison estivale', 'positions_available' => 3],
            ['title' => 'Stage réception hôtelière', 'positions_available' => 2],
        ];
        foreach ($offers as $i => $data) {
            InternshipOffer::firstOrCreate(
                ['title' => $data['title']],
                [
                    'partner_id' => $partners[$i % $partners->count()]->id,
                    'positions_available' => $data['positions_available'],
                    'start_date' => now()->addMonth(),
                    'end_date' => now()->addMonths(3),
                    'is_published' => true,
                ]
            );
        }

        $jobOffers = [
            ['title' => 'Chef de partie', 'contract_type' => 'cdi', 'location' => 'Dakar'],
            ['title' => 'Réceptionniste polyglotte', 'contract_type' => 'cdd', 'location' => 'Saly'],
        ];
        foreach ($jobOffers as $i => $data) {
            JobOffer::firstOrCreate(
                ['title' => $data['title']],
                [
                    'partner_id' => $partners[$i % $partners->count()]->id,
                    'contract_type' => $data['contract_type'],
                    'location' => $data['location'],
                    'is_published' => true,
                ]
            );
        }

        $student = Student::first();
        if ($student) {
            $internship = Internship::firstOrCreate(
                ['title' => 'Stage pratique — cuisine gastronomique', 'student_id' => $student->id],
                [
                    'partner_id' => $partners->first()->id,
                    'start_date' => now()->subMonths(4),
                    'end_date' => now()->subMonths(2),
                    'supervisor_name' => 'Chef Amadou Ba',
                    'status' => 'termine',
                    'evaluation_score' => 16.5,
                    'evaluation_appreciation' => 'Stagiaire sérieux et impliqué, bonne maîtrise des techniques de base.',
                ]
            );
            $internship->generateAttestationNumber();
        }

        $alumnus = Student::skip(1)->first();
        if ($alumnus) {
            $alumnus->update([
                'status' => 'diplome',
                'graduation_year' => 2024,
                'current_position' => 'Chef de cuisine',
                'current_employer' => 'Hôtel Terrou-Bi',
                'is_alumni_public' => true,
                'alumni_bio' => "Diplômé de l'EEHT, aujourd'hui chef de cuisine dans un hôtel de renom à Dakar.",
            ]);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\EventItem;
use App\Models\Faq;
use App\Models\Formation;
use App\Models\NewsArticle;
use App\Models\Partner;
use App\Models\Setting;
use App\Models\Slider;
use App\Models\Teacher;
use App\Models\Testimonial;
use Illuminate\Database\Seeder;

class DemoContentSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-10-01', 'end_date' => '2027-07-31', 'is_current' => true]
        );

        $formations = [
            [
                'name' => 'BTS Hôtellerie & Restauration',
                'code' => 'BTS-HR',
                'diploma' => 'BTS',
                'level' => 'Bac+2',
                'duration' => '2 ans',
                'description' => "Une formation complète alliant gestion hôtelière, art culinaire et service en salle, pour former les futurs cadres de l'hôtellerie-restauration.",
                'objectives' => 'Maîtriser la gestion opérationnelle d\'un établissement hôtelier ou de restauration.',
                'career_prospects' => "Manager d'hôtel, chef de cuisine, responsable de restaurant, maître d'hôtel.",
                'registration_fee' => 50000,
                'tuition_fee' => 750000,
                'capacity' => 40,
                'order' => 1,
            ],
            [
                'name' => 'BTS Tourisme',
                'code' => 'BTS-TOUR',
                'diploma' => 'BTS',
                'level' => 'Bac+2',
                'duration' => '2 ans',
                'description' => 'Formation aux métiers du tourisme : accueil, guidage, agences de voyage et gestion de destinations touristiques.',
                'objectives' => 'Former des professionnels polyvalents du secteur touristique.',
                'career_prospects' => 'Agent de voyage, guide touristique, chargé de clientèle, animateur touristique.',
                'registration_fee' => 50000,
                'tuition_fee' => 700000,
                'capacity' => 35,
                'order' => 2,
            ],
            [
                'name' => 'CAP Cuisine',
                'code' => 'CAP-CUIS',
                'diploma' => 'CAP',
                'level' => 'Niveau V',
                'duration' => '1 an',
                'description' => 'Formation pratique intensive aux techniques culinaires professionnelles dans nos ateliers équipés.',
                'objectives' => 'Acquérir les bases techniques et professionnelles du métier de cuisinier.',
                'career_prospects' => 'Commis de cuisine, cuisinier, chef de partie.',
                'registration_fee' => 30000,
                'tuition_fee' => 450000,
                'capacity' => 30,
                'order' => 3,
            ],
            [
                'name' => 'CAP Restaurant',
                'code' => 'CAP-REST',
                'diploma' => 'CAP',
                'level' => 'Niveau V',
                'duration' => '1 an',
                'description' => 'Apprentissage du service en salle, des techniques de restauration et du savoir-être professionnel.',
                'objectives' => 'Maîtriser les techniques de service et l\'accueil de la clientèle.',
                'career_prospects' => 'Serveur, chef de rang, maître d\'hôtel junior.',
                'registration_fee' => 30000,
                'tuition_fee' => 450000,
                'capacity' => 30,
                'order' => 4,
            ],
            [
                'name' => 'DTS Management Hôtelier',
                'code' => 'DTS-MH',
                'diploma' => 'DTS',
                'level' => 'Bac+3',
                'duration' => '3 ans',
                'description' => "Formation avancée en management et direction d'établissements hôteliers haut de gamme.",
                'objectives' => "Former des cadres dirigeants pour l'hôtellerie internationale.",
                'career_prospects' => "Directeur d'hôtel, directeur général adjoint, responsable d'exploitation.",
                'registration_fee' => 75000,
                'tuition_fee' => 950000,
                'capacity' => 25,
                'order' => 5,
            ],
        ];

        foreach ($formations as $data) {
            Formation::firstOrCreate(['code' => $data['code']], $data);
        }

        $sliders = [
            [
                'title' => "L'excellence hôtelière et touristique à Thiès",
                'subtitle' => "Formez-vous aux métiers de l'hôtellerie, de la restauration et du tourisme dans un cadre professionnel de haut niveau.",
                'image' => 'sliders/slide-1.jpg',
                'button_text' => "Découvrir l'EEHT",
                'button_link' => '/a-propos',
                'order' => 1,
            ],
            [
                'title' => 'Des formations professionnalisantes',
                'subtitle' => 'CAP, BTS, DTS : des parcours adaptés à chaque ambition, encadrés par des professionnels expérimentés.',
                'image' => 'sliders/slide-2.jpg',
                'button_text' => 'Voir nos formations',
                'button_link' => '/formations',
                'order' => 2,
            ],
            [
                'title' => 'Candidatez dès maintenant',
                'subtitle' => 'Les admissions pour la rentrée 2026-2027 sont ouvertes. Déposez votre dossier en ligne en quelques minutes.',
                'image' => 'sliders/slide-3.jpg',
                'button_text' => 'Candidater maintenant',
                'button_link' => '/candidature',
                'order' => 3,
            ],
        ];

        foreach ($sliders as $data) {
            Slider::firstOrCreate(['title' => $data['title']], $data);
        }

        $teachers = [
            ['matricule' => 'ENS-0001', 'first_name' => 'Fatou', 'last_name' => 'Diagne', 'specialty' => 'Cuisine gastronomique', 'experience_years' => 12, 'email' => 'fatou.diagne@eeht-thies.sn'],
            ['matricule' => 'ENS-0002', 'first_name' => 'Moussa', 'last_name' => 'Sarr', 'specialty' => 'Management hôtelier', 'experience_years' => 9, 'email' => 'moussa.sarr@eeht-thies.sn'],
            ['matricule' => 'ENS-0003', 'first_name' => 'Aïssatou', 'last_name' => 'Ba', 'specialty' => 'Tourisme et accueil', 'experience_years' => 7, 'email' => 'aissatou.ba@eeht-thies.sn'],
        ];

        foreach ($teachers as $data) {
            Teacher::firstOrCreate(['matricule' => $data['matricule']], $data);
        }

        $news = [
            [
                'title' => "Journée portes ouvertes 2026 : l'EEHT ouvre ses portes",
                'excerpt' => "L'EEHT de Thiès a accueilli de nombreux visiteurs pour découvrir ses infrastructures et ses formations.",
                'content' => "L'Elite École Hôtelière et Touristique de Thiès a organisé sa traditionnelle journée portes ouvertes, permettant aux futurs candidats et à leurs familles de découvrir les ateliers de cuisine, les salles de restaurant d'application et de rencontrer l'équipe pédagogique.",
                'category' => 'Événement',
                'is_published' => true,
                'is_featured' => true,
                'published_at' => now()->subDays(5),
            ],
            [
                'title' => 'Ouverture des candidatures pour la rentrée 2026-2027',
                'excerpt' => 'Les inscriptions sont désormais ouvertes pour toutes nos formations CAP, BTS et DTS.',
                'content' => "L'EEHT de Thiès annonce l'ouverture des candidatures en ligne pour la rentrée académique 2026-2027. Les candidats peuvent déposer leur dossier directement depuis l'espace candidat du site.",
                'category' => 'Admission',
                'is_published' => true,
                'is_featured' => true,
                'published_at' => now()->subDays(2),
            ],
        ];

        foreach ($news as $data) {
            NewsArticle::firstOrCreate(['title' => $data['title']], $data);
        }

        $events = [
            [
                'title' => 'Journée Portes Ouvertes',
                'description' => 'Venez découvrir nos infrastructures, nos formations et échanger avec nos équipes pédagogiques.',
                'location' => 'Campus EEHT, Thiès',
                'start_at' => now()->addDays(20)->setTime(9, 0),
                'end_at' => now()->addDays(20)->setTime(17, 0),
            ],
            [
                'title' => 'Cérémonie de remise des diplômes',
                'description' => "Célébration de la réussite de la promotion sortante en présence des partenaires de l'école.",
                'location' => 'Auditorium EEHT, Thiès',
                'start_at' => now()->addDays(60)->setTime(10, 0),
            ],
        ];

        foreach ($events as $data) {
            EventItem::firstOrCreate(['title' => $data['title']], $data);
        }

        $partners = [
            ['name' => 'Radisson Blu Dakar', 'type' => 'Hôtel', 'description' => 'Partenaire pour les stages pratiques et l\'insertion professionnelle.'],
            ['name' => 'Pullman Dakar Teranga', 'type' => 'Hôtel', 'description' => "Accueil d'élèves en stage et recrutement d'anciens diplômés."],
            ['name' => 'Office National du Tourisme du Sénégal', 'type' => 'Institution', 'description' => 'Partenariat institutionnel pour la promotion du tourisme.'],
        ];

        foreach ($partners as $data) {
            Partner::firstOrCreate(['name' => $data['name']], $data);
        }

        $testimonials = [
            ['name' => 'Khady Fall', 'role' => 'Ancienne élève, BTS Hôtellerie', 'content' => "L'EEHT m'a donné toutes les clés pour réussir dans l'hôtellerie internationale. L'encadrement et les stages pratiques ont fait toute la différence.", 'rating' => 5],
            ['name' => 'Ibrahima Sy', 'role' => 'Ancien élève, CAP Cuisine', 'content' => 'Une formation exigeante mais passionnante, avec des ateliers modernes et des enseignants très expérimentés.', 'rating' => 5],
        ];

        foreach ($testimonials as $data) {
            Testimonial::firstOrCreate(['name' => $data['name']], $data);
        }

        $faqs = [
            ['question' => 'Quelles sont les conditions d\'admission ?', 'answer' => 'Les conditions varient selon la formation (BFEM pour le CAP, Baccalauréat pour le BTS). Consultez la fiche de chaque formation pour le détail.', 'category' => 'Admission', 'order' => 1],
            ['question' => 'Comment déposer ma candidature ?', 'answer' => "Rendez-vous dans l'espace candidat du site, créez votre dossier et téléversez les documents demandés.", 'category' => 'Admission', 'order' => 2],
            ['question' => 'Quels sont les frais de scolarité ?', 'answer' => 'Les frais varient selon la formation choisie. Ils sont détaillés sur la page de chaque formation.', 'category' => 'Finances', 'order' => 3],
        ];

        foreach ($faqs as $data) {
            Faq::firstOrCreate(['question' => $data['question']], $data);
        }

        Setting::set('site_name', 'Elite École Hôtelière et Touristique de Thiès');
        Setting::set('site_short_name', 'EEHT de Thiès');
        Setting::set('site_email', 'contact@eeht-thies.sn');
        Setting::set('site_phone', '+221 33 951 00 00');
        Setting::set('site_address', 'Route de Dakar, Thiès, Sénégal');
        Setting::set('facebook_url', 'https://facebook.com/eehtthies');
        Setting::set('years_experience', '15');
        Setting::set('students_trained', '2500');
        Setting::set('success_rate', '92');
    }
}

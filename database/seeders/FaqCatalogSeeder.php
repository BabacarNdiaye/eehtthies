<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

class FaqCatalogSeeder extends Seeder
{
    /**
     * Adds FAQ entries drawn only from facts already established elsewhere
     * in the system (admission conditions, diploma recognition, the
     * candidature form and tracking page) — not from figures nobody has
     * confirmed (pass rates, material costs, boarding...). Idempotent via
     * firstOrCreate on the question text, so re-running never duplicates.
     */
    public function run(): void
    {
        $catalog = [
            [
                'question' => "Quelle est la différence entre un Diplôme d'État, un Diplôme d'école et une Attestation ?",
                'answer' => "Le Diplôme d'État est délivré et reconnu par l'État sénégalais (c'est le cas du CAP, du BEP, du BTS et de plusieurs de nos formations). Le Diplôme d'école est délivré par l'établissement lui-même, parfois validé par un organisme professionnel — c'est le cas du BT Restauration, validé par la Chambre des Métiers. L'Attestation sanctionne une formation courte ou une spécialisation pratique. Le type de reconnaissance de chaque formation est indiqué sur sa fiche, à côté de sa durée et de son niveau d'accès.",
                'category' => 'Diplômes & reconnaissance',
                'order' => 1,
            ],
            [
                'question' => 'Puis-je poursuivre mes études après un CAP ou un BEP ?',
                'answer' => "Oui. Le CAP Restauration permet de poursuivre vers le BEP Restauration, et le BEP vers le BT Restauration, sous réserve de satisfaire aux conditions d'admission de chaque niveau. Le détail des poursuites d'études possibles figure dans la rubrique « Débouchés » de chaque formation.",
                'category' => 'Diplômes & reconnaissance',
                'order' => 2,
            ],
            [
                'question' => 'Quels documents dois-je fournir pour candidater ?',
                'answer' => "Le formulaire de candidature en ligne vous demande vos informations personnelles, votre dernier établissement fréquenté, votre dernier diplôme obtenu et une lettre de motivation. Vous pouvez également joindre vos pièces justificatives (pièce d'identité, dernier diplôme ou certificat) au format PDF, JPG ou PNG.",
                'category' => 'Admission',
                'order' => 3,
            ],
            [
                'question' => 'Les formations courtes sont-elles accessibles sans diplôme ?',
                'answer' => "Oui. Les formations courtes (Formation courte en Restauration, Agent de Caisse, Chef de Rang, Barista) ainsi que les Certificats de Spécialité sont accessibles sans diplôme préalable, sur simple motivation.",
                'category' => 'Admission',
                'order' => 4,
            ],
            [
                'question' => 'Comment suivre l\'état d\'avancement de ma candidature ?',
                'answer' => "Une fois votre dossier soumis, vous recevez une référence de suivi unique. Vous pouvez consulter l'état de votre candidature à tout moment depuis la page « Suivre ma candidature », en indiquant cette référence et votre adresse email.",
                'category' => 'Admission',
                'order' => 5,
            ],
            [
                'question' => 'Les formations incluent-elles un stage en entreprise ?',
                'answer' => "La plupart de nos formations diplômantes (CAP, BEP, BT, BTS, DTS) incluent un stage professionnel en entreprise dans leur programme. Le détail — durée et place du stage dans le cursus — figure dans la rubrique « Programme » de chaque formation.",
                'category' => 'Scolarité',
                'order' => 6,
            ],
        ];

        foreach ($catalog as $data) {
            Faq::firstOrCreate(
                ['question' => $data['question']],
                [...$data, 'is_published' => true],
            );
        }
    }
}

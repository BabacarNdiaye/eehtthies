<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Journal;
use Illuminate\Database\Seeder;

class AccountingSeeder extends Seeder
{
    public function run(): void
    {
        $journals = [
            ['code' => 'VTE', 'name' => 'Journal des ventes'],
            ['code' => 'AC', 'name' => 'Journal des achats'],
            ['code' => 'BQ', 'name' => 'Journal de banque'],
            ['code' => 'CAI', 'name' => 'Journal de caisse'],
            ['code' => 'OD', 'name' => 'Journal des opérations diverses'],
        ];

        foreach ($journals as $journal) {
            Journal::firstOrCreate(['code' => $journal['code']], $journal);
        }

        $accounts = [
            // Classe 1 — Ressources durables
            ['101000', 'Capital', 1, 'passif'],
            ['120000', "Résultat de l'exercice", 1, 'passif'],
            ['161000', 'Emprunts', 1, 'passif'],

            // Classe 2 — Actif immobilisé
            ['211000', 'Terrains', 2, 'actif'],
            ['218000', 'Autres immobilisations corporelles', 2, 'actif'],

            // Classe 3 — Stocks
            ['311000', 'Stocks de fournitures et matières', 3, 'actif'],

            // Classe 4 — Tiers
            ['401000', 'Fournisseurs', 4, 'passif'],
            ['411000', 'Clients — Élèves', 4, 'actif'],
            ['421000', 'Personnel — rémunérations dues', 4, 'passif'],
            ['431000', 'Caisse de sécurité sociale', 4, 'passif'],
            ['441000', 'État — impôts et taxes', 4, 'passif'],
            ['447000', 'État — retenues à la source', 4, 'passif'],

            // Classe 5 — Trésorerie
            ['521000', 'Banque', 5, 'actif'],
            ['571000', 'Caisse', 5, 'actif'],

            // Classe 6 — Charges
            ['601000', 'Achats de fournitures', 6, 'charge'],
            ['605000', 'Autres achats', 6, 'charge'],
            ['615000', 'Entretien, réparations et maintenance', 6, 'charge'],
            ['622000', 'Locations', 6, 'charge'],
            ['623000', 'Publicité, publications, relations publiques', 6, 'charge'],
            ['624000', 'Transports', 6, 'charge'],
            ['628000', 'Charges diverses', 6, 'charge'],
            ['631000', 'Impôts et taxes directs', 6, 'charge'],
            ['661000', 'Rémunérations directes versées au personnel', 6, 'charge'],
            ['664000', 'Charges sociales sur rémunérations', 6, 'charge'],
            ['681000', 'Dotations aux amortissements', 6, 'charge'],

            // Classe 7 — Produits
            ['706100', "Produits des frais d'inscription", 7, 'produit'],
            ['706200', 'Produits de la scolarité et mensualités', 7, 'produit'],
            ['707000', "Autres produits d'exploitation", 7, 'produit'],
            ['758000', 'Produits divers', 7, 'produit'],
        ];

        foreach ($accounts as [$code, $name, $class, $nature]) {
            Account::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'class' => $class, 'nature' => $nature]
            );
        }
    }
}

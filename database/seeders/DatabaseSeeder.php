<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Alimente la base de données de l'application.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            DemoContentSeeder::class,
            PedagogySeeder::class,
            FinanceSeeder::class,
            CareerSeeder::class,
            FormationsCatalogSeeder::class,
            AccountingSeeder::class,
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Support\CouncilDefaults;
use Illuminate\Database\Seeder;

/** Référentiels de départ du conseil de classe (voir CouncilDefaults) : sert à la réinitialisation des données. */
class CouncilDefaultsSeeder extends Seeder
{
    public function run(): void
    {
        CouncilDefaults::install();
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Setting;
use Illuminate\Console\Command;

class HarmonizeGreenAccentWithBurgundy extends Command
{
    protected $signature = 'app:harmonize-green-accent';

    protected $description = "Ponctuelle : l'école avait réglé l'accent principal de son thème (theme_primary_color, rôle « gold » — chaque bouton d'appel à l'action, badge de confiance et surlignage d'état actif du site) sur un vert citron vif (#8bc93f, par coïncidence la couleur d'accent par défaut de la palette) face à une palette neutre et secondaire bordeaux/vin (ink/brand). Le contraste a été signalé lors d'une revue de design. Le propriétaire a choisi de garder un accent vert mais harmonisé, plutôt que de revenir à l'or. La commande le fait passer à un jade/émeraude sourd (teinte plus froide, saturation plus faible) qui s'associe classiquement au bordeaux, et fait de même pour theme_accent_color (« leaf », utilisé sur les badges d'information des formations), qui avait dérivé vers un bordeaux presque noir rendant ces badges illisibles.";

    public function handle(): int
    {
        $before = [
            'theme_primary_color' => Setting::get('theme_primary_color'),
            'theme_accent_color' => Setting::get('theme_accent_color'),
        ];

        Setting::set('theme_primary_color', '#56B385'); // rôle gold — jade/émeraude, était #8bc93f (citron vert)
        Setting::set('theme_accent_color', '#4A9D6E');  // rôle leaf — légèrement plus foncé, avait dérivé vers un bordeaux presque noir

        $this->info('Avant : '.json_encode($before));
        $this->info('theme_primary_color -> #56B385, theme_accent_color -> #4A9D6E');

        return self::SUCCESS;
    }
}

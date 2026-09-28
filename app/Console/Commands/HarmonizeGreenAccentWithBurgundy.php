<?php

namespace App\Console\Commands;

use App\Models\Setting;
use Illuminate\Console\Command;

class HarmonizeGreenAccentWithBurgundy extends Command
{
    protected $signature = 'app:harmonize-green-accent';

    protected $description = "One-time: the school set its theme's primary accent (theme_primary_color, role 'gold' — every CTA button, trust badge and active-state highlight site-wide) to a vivid lime green (#8bc93f, coincidentally the palette's own default accent color) against a burgundy/wine neutral+secondary palette (ink/brand). The clash was flagged in a design review. Owner chose to keep a green accent but have it harmonized rather than go back to gold. This shifts it to a muted jade/emerald (cooler hue, lower saturation) that pairs classically with burgundy, and does the same for theme_accent_color ('leaf', used on formation info badges) which had drifted to a near-black burgundy making those badges illegible.";

    public function handle(): int
    {
        $before = [
            'theme_primary_color' => Setting::get('theme_primary_color'),
            'theme_accent_color' => Setting::get('theme_accent_color'),
        ];

        Setting::set('theme_primary_color', '#56B385'); // gold role — jade/emerald, was #8bc93f (lime)
        Setting::set('theme_accent_color', '#4A9D6E');  // leaf role — slightly deeper, was drifted to near-black burgundy

        $this->info('Before: '.json_encode($before));
        $this->info('theme_primary_color -> #56B385, theme_accent_color -> #4A9D6E');

        return self::SUCCESS;
    }
}

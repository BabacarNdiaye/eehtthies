<?php

namespace App\Providers;

use App\Listeners\LogUserLogin;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Enregistre les services de l'application.
     */
    public function register(): void
    {
        //
    }

    /**
     * Démarre les services de l'application.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Dates (mois, jours) en français partout : pages, courriels, PDF.
        Carbon::setLocale('fr');

        Event::listen(Login::class, LogUserLogin::class);
    }
}

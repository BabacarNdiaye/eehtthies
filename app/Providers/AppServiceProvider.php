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
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Dates (mois, jours) en français partout : pages, courriels, PDF.
        Carbon::setLocale('fr');

        Event::listen(Login::class, LogUserLogin::class);
    }
}

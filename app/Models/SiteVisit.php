<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Une page vue du site public, avec la localisation approximative du visiteur (pays, région, ville). */
class SiteVisit extends Model
{
    protected $fillable = ['ip_address', 'country_code', 'country', 'region', 'city', 'path', 'user_agent'];
}

<?php

namespace App\Support;

use RuntimeException;

/** Un versement de salaire refusé pour une raison que l'opérateur peut comprendre et corriger (mois déjà payé…). */
class SalaryException extends RuntimeException {}

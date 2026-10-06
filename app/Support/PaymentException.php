<?php

namespace App\Support;

use RuntimeException;

/** Un encaissement refusé pour une raison que l'opérateur peut comprendre et corriger (solde dépassé, canal inconnu…). */
class PaymentException extends RuntimeException {}

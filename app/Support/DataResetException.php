<?php

namespace App\Support;

use RuntimeException;

/**
 * Échec de la réinitialisation des données : le message est destiné à l'administrateur et n'est levé
 * qu'avant la validation de la transaction, donc sans qu'aucune donnée n'ait été supprimée.
 */
class DataResetException extends RuntimeException {}

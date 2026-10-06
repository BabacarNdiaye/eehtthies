<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Mots de passe provisoires des comptes créés par l'administration (élèves, parents, enseignants).
 *
 * Chaque compte reçoit son propre mot de passe aléatoire, et doit le changer à sa première connexion
 * (users.must_change_password, imposé par le middleware ForcePasswordChange). L'ancien mot de passe commun,
 * longtemps écrit dans la configuration, n'est plus qu'une valeur interdite : un compte qui l'a encore est repéré
 * à sa prochaine connexion et doit en changer.
 */
class TemporaryPassword
{
    /** Ancien mot de passe commun à tous les comptes : refusé partout, et signalé chez qui l'a gardé. */
    public const LEGACY = 'eeht2026';

    /** Sans 0/O, 1/l/I ni b/6 : le mot de passe se lit et se recopie sans erreur. */
    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2345789';

    public static function generate(int $length = 10): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $password = '';

        for ($i = 0; $i < $length; $i++) {
            $password .= self::ALPHABET[random_int(0, $max)];
        }

        return $password;
    }

    /**
     * La colonne existe-t-elle ? Tant que la migration n'est pas passée (fichiers déposés avant « migrate »), le site
     * continue de fonctionner sans l'obligation de changer de mot de passe, au lieu de planter à la connexion.
     */
    public static function supported(): bool
    {
        static $supported = null;

        return $supported ??= Schema::hasColumn('users', 'must_change_password');
    }

    /** Attributs à ajouter à une mise à jour de compte : vide si la colonne n'existe pas encore. @return array<string, bool> */
    public static function flag(bool $mustChange): array
    {
        return self::supported() ? ['must_change_password' => $mustChange] : [];
    }

    /** Vrai quand le compte porte encore l'ancien mot de passe commun. */
    public static function isLegacy(User $user): bool
    {
        return Hash::check(self::LEGACY, $user->password);
    }
}

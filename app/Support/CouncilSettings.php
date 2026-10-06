<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Réglages du module Conseil de classe, rangés dans la table `settings` (groupe « conseils ») : une table de moins
 * qu'une `council_settings`, et hors du périmètre de la réinitialisation des données (liste blanche de clés).
 *
 * Réglages du lot V1 : double validation du PV (PAR-09), délai de recours (RG-20) et durée comptée pour une absence dont
 * le créneau n'est pas connu. Les règles de vote (V3) s'ajoutent ici.
 */
class CouncilSettings
{
    public const GROUP = 'conseils';

    /** Valeurs tant que rien n'a été enregistré. */
    public const DEFAULTS = [
        'double_validation' => true,
        'appeal_days' => 8,
        'default_absence_hours' => 1.0,
        // Règles de vote (PAR-08, V3).
        'vote_functions' => 'president,main_teacher,teacher',
        'vote_majority' => 'expressed',
        'vote_casting' => true,
        'vote_secrecy' => 'nominal',
        'vote_mode' => 'device',
        // Message aux familles à la clôture (PAR-10, DIR-07) : désactivé tant que l'école ne l'active pas.
        'family_notify' => false,
        'family_subject' => 'Conseil de classe — {periode}',
        'family_message' => 'Bonjour, le conseil de classe de {classe} ({periode}) s’est tenu. L’appréciation et la décision concernant {prenom} sont disponibles dans votre espace EEHT : {lien}',
    ];

    /** Mots remplacés dans les modèles de message. */
    public const PLACEHOLDERS = [
        '{eleve}' => 'Prénom et nom de l’élève',
        '{prenom}' => 'Prénom de l’élève',
        '{classe}' => 'Classe',
        '{periode}' => 'Période (Semestre 1…)',
        '{annee}' => 'Année scolaire',
        '{lien}' => 'Lien vers l’espace de la famille',
    ];

    /** Fonctions de conseil qui peuvent recevoir le droit de vote (le membre doit aussi l'avoir : `can_vote`). */
    public const VOTING_FUNCTIONS = ['president', 'main_teacher', 'teacher', 'school_life', 'secretary', 'delegate_student', 'delegate_parent', 'tutor', 'other'];

    private static function key(string $name): string
    {
        return self::GROUP.'_'.$name;
    }

    /** PAR-09 : le PV passe par le responsable pédagogique puis par la Direction (sinon, la Direction seule). */
    public static function doubleValidation(): bool
    {
        return Setting::flag(self::key('double_validation'), self::DEFAULTS['double_validation']);
    }

    /** RG-20 : jours dont dispose une famille pour déposer un recours, après notification. */
    public static function appealDays(): int
    {
        return max(1, (int) Setting::get(self::key('appeal_days'), self::DEFAULTS['appeal_days']));
    }

    /** RG-05 : heures comptées pour une absence dont le créneau d'emploi du temps n'est pas connu. */
    public static function defaultAbsenceHours(): float
    {
        return max(0.0, (float) Setting::get(self::key('default_absence_hours'), self::DEFAULTS['default_absence_hours']));
    }

    /** @return list<string> PAR-08 : fonctions votantes (RG-13 compte les membres votants convoqués). */
    public static function voteFunctions(): array
    {
        $stored = (string) Setting::get(self::key('vote_functions'), self::DEFAULTS['vote_functions']);

        return array_values(array_intersect(self::VOTING_FUNCTIONS, array_map('trim', explode(',', $stored))));
    }

    /** RG-14 : « expressed » (majorité simple des suffrages exprimés) ou « absolute_present » (majorité absolue des présents). */
    public static function voteMajority(): string
    {
        $value = (string) Setting::get(self::key('vote_majority'), self::DEFAULTS['vote_majority']);

        return in_array($value, ['expressed', 'absolute_present'], true) ? $value : self::DEFAULTS['vote_majority'];
    }

    /** RG-15 : voix prépondérante du président en cas d'égalité. */
    public static function voteCasting(): bool
    {
        return Setting::flag(self::key('vote_casting'), self::DEFAULTS['vote_casting']);
    }

    /** VOT-05 : « nominal » (le choix de chacun est conservé) ou « secret ». */
    public static function voteSecrecy(): string
    {
        return Setting::get(self::key('vote_secrecy'), self::DEFAULTS['vote_secrecy']) === 'secret' ? 'secret' : 'nominal';
    }

    /** VOT-02 : mode proposé par défaut au président (« device » ou « show_of_hands »). */
    public static function voteMode(): string
    {
        return Setting::get(self::key('vote_mode'), self::DEFAULTS['vote_mode']) === 'show_of_hands' ? 'show_of_hands' : 'device';
    }

    /** DIR-07 : prévenir les familles à la clôture (e-mail, notification, EEHT Connect). */
    public static function familyNotify(): bool
    {
        return Setting::flag(self::key('family_notify'), self::DEFAULTS['family_notify']);
    }

    public static function familySubject(): string
    {
        return (string) (Setting::get(self::key('family_subject')) ?: self::DEFAULTS['family_subject']);
    }

    public static function familyMessage(): string
    {
        return (string) (Setting::get(self::key('family_message')) ?: self::DEFAULTS['family_message']);
    }

    /** @param  array<string, string>  $values  {eleve}, {prenom}… → valeur */
    public static function render(string $template, array $values): string
    {
        return strtr($template, $values);
    }

    /** @return array<string, mixed> */
    public static function all(): array
    {
        return [
            'double_validation' => self::doubleValidation(),
            'appeal_days' => self::appealDays(),
            'default_absence_hours' => self::defaultAbsenceHours(),
            'vote_functions' => self::voteFunctions(),
            'vote_majority' => self::voteMajority(),
            'vote_casting' => self::voteCasting(),
            'vote_secrecy' => self::voteSecrecy(),
            'vote_mode' => self::voteMode(),
            'family_notify' => self::familyNotify(),
            'family_subject' => self::familySubject(),
            'family_message' => self::familyMessage(),
        ];
    }

    /**
     * @param  array<string, mixed>  $values  seules les clés de DEFAULTS sont retenues
     */
    public static function update(array $values): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $name => $value) {
            $stored = match (true) {
                is_bool($value) => $value ? '1' : '0',
                is_array($value) => implode(',', $value),
                default => (string) $value,
            };
            Setting::set(self::key($name), $stored, self::GROUP);
        }
    }
}

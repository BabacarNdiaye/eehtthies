<?php

namespace App\Support;

use App\Models\Student;

/**
 * Complétude du dossier d'un élève : cinq pièces essentielles pour gérer une scolarité (une photo pour la carte,
 * la date de naissance, un numéro où le joindre — le sien ou celui du tuteur —, l'adresse, et quelqu'un à prévenir en
 * cas de problème). Le résultat s'affiche sur la fiche de chaque élève (« Dossier 4/5 », avec ce qui manque) et sert
 * à compter et à filtrer les dossiers à compléter d'une promotion entière.
 *
 * La règle est écrite deux fois, en PHP (summarize) et en SQL (incompleteSql), pour qu'on n'ait jamais à charger
 * tous les élèves d'une promotion pour les compter ; StudentDossierTest vérifie qu'elles s'accordent. Une chaîne
 * vide vaut NULL : Laravel convertit déjà les champs vides des formulaires en NULL.
 */
final class StudentDossier
{
    /** Les cinq pièces d'un dossier complet : clé => libellé. */
    public const ITEMS = [
        'photo' => 'Photo',
        'birth_date' => 'Date de naissance',
        'phone' => 'Téléphone',
        'address' => 'Adresse',
        'emergency' => 'Personne à prévenir',
    ];

    /** @return array{done: int, total: int, items: list<array{key: string, label: string, ok: bool}>, missing: list<string>} */
    public static function summarize(Student $student): array
    {
        $filled = fn (mixed $value): bool => $value !== null && $value !== '';

        $present = [
            'photo' => $filled($student->photo),
            'birth_date' => $student->birth_date !== null,
            'phone' => $filled($student->phone) || $filled($student->guardian_phone),
            'address' => $filled($student->address),
            'emergency' => $filled($student->guardian_name) || $filled($student->emergency_contact),
        ];

        $items = [];
        $missing = [];

        foreach (self::ITEMS as $key => $label) {
            $items[] = ['key' => $key, 'label' => $label, 'ok' => $present[$key]];

            if (! $present[$key]) {
                $missing[] = $label;
            }
        }

        return ['done' => count(self::ITEMS) - count($missing), 'total' => count(self::ITEMS), 'items' => $items, 'missing' => $missing];
    }

    /** Condition SQL, sur les colonnes de `students`, vraie pour un dossier incomplet : la même règle que summarize(). */
    public static function incompleteSql(): string
    {
        return "(coalesce(students.photo, '') = ''"
            .' or students.birth_date is null'
            ." or (coalesce(students.phone, '') = '' and coalesce(students.guardian_phone, '') = '')"
            ." or coalesce(students.address, '') = ''"
            ." or (coalesce(students.guardian_name, '') = '' and coalesce(students.emergency_contact, '') = ''))";
    }
}

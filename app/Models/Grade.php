<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * La note d'un élève à une épreuve. Son statut décide de ce qu'une note manquante vaut au bulletin :
 * présent = la note compte ; absence non justifiée = 0 qui compte dans la moyenne ; absence justifiée =
 * l'évaluation est ignorée (voir ReportCardCalculator).
 *
 * `status` fait foi. `is_absent` est conservé pour le code et les pages qui le lisent encore : il est
 * recalculé à chaque enregistrement (vrai dès que le statut n'est pas « présent »).
 */
class Grade extends Model
{
    public const PRESENT = 'present';

    public const ABSENT_JUSTIFIED = 'absent_justifie';

    public const ABSENT_UNJUSTIFIED = 'absent_non_justifie';

    public const STATUSES = [
        self::PRESENT => 'Présent(e)',
        self::ABSENT_JUSTIFIED => 'Absent(e) justifié(e)',
        self::ABSENT_UNJUSTIFIED => 'Absent(e) non justifié(e)',
    ];

    protected $fillable = ['exam_id', 'student_id', 'score', 'status', 'is_absent', 'comment', 'entered_by'];

    protected $casts = [
        'score' => 'decimal:2',
        'is_absent' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (Grade $grade) {
            // Écriture « à l'ancienne » : seule la case is_absent est renseignée (ou a bougé), le statut en découle.
            // Une absence cochée sans précision est une absence non justifiée — c'est la règle tant qu'aucune
            // justification n'existe.
            if ($grade->status === null) {
                $grade->status = $grade->is_absent ? self::ABSENT_UNJUSTIFIED : self::PRESENT;
            } elseif ($grade->exists && $grade->isDirty('is_absent') && ! $grade->isDirty('status')) {
                if ($grade->is_absent && $grade->status === self::PRESENT) {
                    $grade->status = self::ABSENT_UNJUSTIFIED;
                } elseif (! $grade->is_absent && $grade->status !== self::PRESENT) {
                    $grade->status = self::PRESENT;
                }
            }

            $grade->is_absent = $grade->status !== self::PRESENT;

            // Une absence n'a pas de note : on n'en garde jamais une, même saisie par erreur.
            if ($grade->is_absent) {
                $grade->score = null;
            }
        });
    }

    /**
     * Colonnes d'une ligne de feuille de notes (saisie de l'administration ou de l'enseignant). Le statut fait foi ;
     * une ancienne page qui n'envoie que la case « absent » donne une absence non justifiée.
     *
     * @param  array<string, mixed>  $entry
     * @return array<string, mixed>
     */
    public static function entryAttributes(array $entry, ?int $enteredBy): array
    {
        $status = $entry['status'] ?? (($entry['is_absent'] ?? false) ? self::ABSENT_UNJUSTIFIED : self::PRESENT);

        return [
            'status' => $status,
            'score' => $status === self::PRESENT ? ($entry['score'] ?? null) : null,
            'comment' => $entry['comment'] ?? null,
            'entered_by' => $enteredBy,
        ];
    }

    /** Le statut, avec repli sur `is_absent` pour une base dont la migration du statut n'a pas encore tourné. */
    public function resolvedStatus(): string
    {
        return $this->status ?? ($this->is_absent ? self::ABSENT_JUSTIFIED : self::PRESENT);
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function enteredBy()
    {
        return $this->belongsTo(User::class, 'entered_by');
    }
}

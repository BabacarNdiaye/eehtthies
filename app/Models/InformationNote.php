<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Note d'information officielle de la Direction : numérotée (N° 000026.MEFPA/EEHT/DIR), datée, avec objet et
 * contenu, imprimable sur le papier à en-tête de l'école et diffusée aux destinataires via une Announcement.
 */
class InformationNote extends Model
{
    public const REFERENCE_SUFFIX = 'MEFPA/EEHT/DIR';

    protected $fillable = [
        'year', 'number', 'note_date', 'subject', 'body', 'audience_type', 'audience_id', 'announcement_id', 'created_by',
    ];

    protected $casts = [
        'note_date' => 'date',
    ];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Prochain numéro de l'année (la numérotation repart de 1 chaque année civile). */
    public static function nextNumber(int $year): int
    {
        return (int) self::where('year', $year)->max('number') + 1;
    }

    /** Crée la note avec un numéro attribué sous verrou, puis la diffuse. */
    public static function issue(array $data, int $createdBy): self
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $year = (int) date('Y', strtotime($data['note_date']));
            $announcement = Announcement::broadcast([
                'title' => $data['subject'],
                'body' => $data['body'],
                'priority' => 'importante',
                'audience_type' => $data['audience_type'],
                'audience_id' => $data['audience_id'] ?? null,
            ], $createdBy);

            // L'index unique (year, number) garantit qu'aucun numéro n'est attribué deux fois.
            return self::create([
                ...$data,
                'year' => $year,
                'number' => self::nextNumber($year),
                'announcement_id' => $announcement->id,
                'created_by' => $createdBy,
            ]);
        });
    }

    public function getReferenceAttribute(): string
    {
        return str_pad((string) $this->number, 6, '0', STR_PAD_LEFT).'.'.self::REFERENCE_SUFFIX;
    }

    public function getAudienceLabelAttribute(): string
    {
        return Announcement::AUDIENCE_TYPES[$this->audience_type] ?? $this->audience_type;
    }
}

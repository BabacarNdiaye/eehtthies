<?php

namespace App\Models;

use App\Notifications\PushAlert;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ReportCard extends Model
{
    protected $fillable = [
        'student_id', 'school_class_id', 'academic_year_id', 'term',
        'average', 'rank', 'class_size', 'decision', 'mention', 'class_average',
        'previous_term_average', 'annual_average', 'annual_rank',
        'retard_count', 'absence_count', 'unjustified_absence_count',
        'general_appreciation', 'council_id', 'decision_provisional', 'qr_token', 'is_published', 'generated_at',
    ];

    protected $casts = [
        'average' => 'decimal:2',
        'class_average' => 'decimal:2',
        'previous_term_average' => 'decimal:2',
        'annual_average' => 'decimal:2',
        'is_published' => 'boolean',
        'decision_provisional' => 'boolean',
        'generated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ReportCard $reportCard) {
            if (empty($reportCard->qr_token)) {
                $reportCard->qr_token = Str::random(24);
            }
        });

        static::updated(function (ReportCard $reportCard) {
            if ($reportCard->wasChanged('is_published') && $reportCard->is_published) {
                $reportCard->student?->user?->notify(new PushAlert(
                    'Bulletin disponible',
                    "{$reportCard->term} · consultable dans votre espace",
                    '/espace-eleve/notes'
                ));
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /** Conseil de classe qui a fixé l'appréciation, la mention et la décision de ce bulletin. */
    public function council()
    {
        return $this->belongsTo(Council::class);
    }
}

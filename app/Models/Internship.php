<?php

namespace App\Models;

use App\Models\Concerns\HasAttachments;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Internship extends Model
{
    use HasAttachments;

    protected $fillable = [
        'student_id', 'partner_id', 'internship_offer_id', 'title', 'start_date', 'end_date',
        'supervisor_name', 'supervisor_phone', 'supervisor_email', 'status',
        'evaluation_score', 'evaluation_appreciation', 'attestation_number',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'evaluation_score' => 'decimal:2',
    ];

    public const STATUSES = [
        'en_cours' => 'En cours',
        'termine' => 'Terminé',
        'abandonne' => 'Abandonné',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function partner()
    {
        return $this->belongsTo(Partner::class);
    }

    public function internshipOffer()
    {
        return $this->belongsTo(InternshipOffer::class);
    }

    public function generateAttestationNumber(): string
    {
        if (empty($this->attestation_number)) {
            $this->attestation_number = 'ATT-'.now()->format('Y').'-'.strtoupper(Str::random(6));
            $this->save();
        }

        return $this->attestation_number;
    }
}

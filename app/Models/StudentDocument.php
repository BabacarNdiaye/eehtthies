<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentDocument extends Model
{
    public const TYPES = [
        'acte_naissance' => 'Acte de naissance',
        'piece_identite' => "Pièce d'identité",
        'photo_identite' => "Photo d'identité",
        'certificat_medical' => 'Certificat médical',
        'diplome' => 'Diplôme / attestation',
        'bulletin' => 'Bulletin précédent',
        'autre' => 'Autre',
    ];

    protected $fillable = [
        'student_id', 'type', 'title', 'file_path', 'uploaded_by',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

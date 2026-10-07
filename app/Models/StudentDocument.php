<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

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

    /**
     * Garantit que le fichier est sur le disque privé : s'il est encore sur l'ancien disque public (liens ouverts à
     * tous), il est déplacé. Renvoie le disque où il se trouve, ou null s'il n'existe plus.
     */
    public function privatize(): ?string
    {
        $private = Storage::disk('local');

        if ($private->exists($this->file_path)) {
            // Un doublon laissé sur le disque public est supprimé : il resterait ouvert à tous.
            Storage::disk('public')->delete($this->file_path);

            return 'local';
        }

        $public = Storage::disk('public');

        if (! $public->exists($this->file_path)) {
            return null;
        }

        $stream = $public->readStream($this->file_path);
        $private->put($this->file_path, $stream);
        if (is_resource($stream)) {
            fclose($stream);
        }

        if ($private->exists($this->file_path)) {
            $public->delete($this->file_path);

            return 'local';
        }

        return 'public';
    }
}

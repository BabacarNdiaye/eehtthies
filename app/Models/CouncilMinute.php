<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Une version définitive du procès-verbal d'un conseil. Le fichier vit sur le disque privé et n'est jamais régénéré : une
 * rectification crée la version suivante, les précédentes restent consultables (RG-19). Seul le PV signé scanné peut être
 * joint après coup (PV-05) : ce modèle n'est donc pas verrouillé par la clôture.
 */
class CouncilMinute extends Model
{
    public const DISK = 'local';

    protected $fillable = [
        'council_id', 'version', 'number', 'file_path', 'sha256', 'content_hash', 'generated_at', 'generated_by',
        'signed_scan_path', 'signed_scan_uploaded_at', 'rectification_reason',
    ];

    protected $casts = [
        'version' => 'integer',
        'generated_at' => 'datetime',
        'signed_scan_uploaded_at' => 'datetime',
    ];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Une étape du circuit du PV : soumission, validation pédagogique, validation de la Direction, ou renvoi en rédaction. */
class CouncilValidation extends Model
{
    public const STEPS = [
        'submission' => 'Soumission',
        'pedagogical' => 'Responsable pédagogique',
        'direction' => 'Direction',
    ];

    public const ACTIONS = [
        'submitted' => 'Soumis à validation',
        'approved' => 'Validé',
        'returned' => 'Renvoyé en rédaction',
    ];

    protected $fillable = ['council_id', 'step', 'user_id', 'action', 'comment', 'acted_at'];

    protected $casts = ['acted_at' => 'datetime'];

    public function council()
    {
        return $this->belongsTo(Council::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

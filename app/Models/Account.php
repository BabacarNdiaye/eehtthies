<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = ['code', 'name', 'class', 'nature', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public const NATURES = [
        'actif' => 'Actif',
        'passif' => 'Passif',
        'charge' => 'Charge',
        'produit' => 'Produit',
    ];

    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    /** Solde côté débit pour les comptes d'actif et de charge, côté crédit pour ceux de passif et de produit. */
    public function balanceBetween(?string $from = null, ?string $to = null): float
    {
        $query = $this->lines()->whereHas('journalEntry', function ($q) use ($from, $to) {
            if ($from) {
                $q->where('entry_date', '>=', $from);
            }
            if ($to) {
                $q->where('entry_date', '<=', $to);
            }
        });

        $debit = (float) (clone $query)->sum('debit');
        $credit = (float) (clone $query)->sum('credit');

        return in_array($this->nature, ['actif', 'charge'])
            ? round($debit - $credit, 2)
            : round($credit - $debit, 2);
    }
}

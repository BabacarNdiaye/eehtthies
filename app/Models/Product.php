<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name', 'category', 'unit', 'unit_cost', 'quantity_in_stock',
        'min_threshold', 'supplier_id', 'is_active',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'quantity_in_stock' => 'decimal:2',
        'min_threshold' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public const CATEGORIES = [
        'alimentaire' => 'Produits alimentaires',
        'boissons' => 'Boissons & consommables',
        'entretien' => "Produits d'entretien",
        'materiel_cuisine' => 'Matériel de cuisine',
        'materiel_restauration' => 'Matériel de restauration',
        'materiel_hotelier' => 'Matériel hôtelier',
        'uniformes' => 'Uniformes',
        'fournitures' => 'Fournitures administratives',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getIsLowStockAttribute(): bool
    {
        return (float) $this->quantity_in_stock <= (float) $this->min_threshold;
    }

    public function getValuationAttribute(): float
    {
        return round((float) $this->quantity_in_stock * (float) $this->unit_cost, 2);
    }
}

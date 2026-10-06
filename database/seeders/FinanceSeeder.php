<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Student;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::where('is_current', true)->first();

        $suppliers = [
            ['name' => 'Grossiste Thiès Alimentation', 'contact_name' => 'Modou Kane', 'phone' => '77 111 22 33'],
            ['name' => 'Sénégal Hôtellerie Équipements', 'contact_name' => 'Fatou Ndoye', 'phone' => '77 222 33 44'],
        ];
        foreach ($suppliers as $data) {
            Supplier::firstOrCreate(['name' => $data['name']], $data);
        }
        $foodSupplier = Supplier::where('name', 'Grossiste Thiès Alimentation')->first();
        $equipSupplier = Supplier::where('name', 'Sénégal Hôtellerie Équipements')->first();

        $products = [
            ['name' => 'Farine de blé', 'category' => 'alimentaire', 'unit' => 'kg', 'unit_cost' => 450, 'quantity_in_stock' => 80, 'min_threshold' => 20, 'supplier_id' => $foodSupplier->id],
            ['name' => 'Huile de tournesol', 'category' => 'alimentaire', 'unit' => 'litre', 'unit_cost' => 1200, 'quantity_in_stock' => 15, 'min_threshold' => 20, 'supplier_id' => $foodSupplier->id],
            ['name' => 'Riz parfumé', 'category' => 'alimentaire', 'unit' => 'kg', 'unit_cost' => 600, 'quantity_in_stock' => 100, 'min_threshold' => 25, 'supplier_id' => $foodSupplier->id],
            ['name' => 'Produit dégraissant', 'category' => 'entretien', 'unit' => 'litre', 'unit_cost' => 2500, 'quantity_in_stock' => 8, 'min_threshold' => 10, 'supplier_id' => null],
            ['name' => 'Assiettes de service', 'category' => 'materiel_restauration', 'unit' => 'pièce', 'unit_cost' => 1500, 'quantity_in_stock' => 60, 'min_threshold' => 15, 'supplier_id' => $equipSupplier->id],
            ['name' => 'Toques de cuisine', 'category' => 'uniformes', 'unit' => 'pièce', 'unit_cost' => 3500, 'quantity_in_stock' => 25, 'min_threshold' => 10, 'supplier_id' => $equipSupplier->id],
        ];
        foreach ($products as $data) {
            Product::firstOrCreate(['name' => $data['name']], $data);
        }

        $students = Student::take(4)->get();
        foreach ($students as $i => $student) {
            $invoice = Invoice::firstOrCreate(
                ['student_id' => $student->id, 'type' => 'scolarite', 'academic_year_id' => $year?->id],
                [
                    'label' => 'Frais de scolarité — '.now()->format('Y').'/'.(now()->year + 1),
                    'amount' => 750000,
                    'due_date' => now()->addMonths(2),
                ]
            );

            if ($i < 2) {
                Payment::firstOrCreate(
                    ['invoice_id' => $invoice->id, 'amount' => $i === 0 ? 750000 : 300000],
                    ['method' => 'especes', 'paid_at' => now()->subDays(10 + $i * 3)]
                );
            }
        }

        $expenses = [
            ['category' => 'salaires', 'label' => 'Salaires du personnel — mois en cours', 'amount' => 3500000, 'expense_date' => now()->subDays(5), 'payment_method' => 'virement'],
            ['category' => 'fournisseurs', 'label' => 'Achat denrées alimentaires', 'amount' => 250000, 'expense_date' => now()->subDays(12), 'payment_method' => 'especes', 'supplier_name' => 'Grossiste Thiès Alimentation'],
            ['category' => 'maintenance', 'label' => 'Entretien matériel de cuisine', 'amount' => 85000, 'expense_date' => now()->subDays(20), 'payment_method' => 'especes'],
            ['category' => 'transport', 'label' => 'Transport élèves — sortie pédagogique', 'amount' => 120000, 'expense_date' => now()->subDays(25), 'payment_method' => 'virement'],
        ];
        foreach ($expenses as $data) {
            Expense::firstOrCreate(['label' => $data['label']], $data);
        }
    }
}

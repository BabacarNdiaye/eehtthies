<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplyRequest;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Économat : commandes aux fournisseurs, réception, demandes de matériel des ateliers, inventaire. */
class EconomatTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
        $this->supplier = Supplier::create(['name' => 'Marché de Thiès']);
    }

    private function product(string $name, float $stock = 0, float $cost = 0): Product
    {
        return Product::create(['name' => $name, 'category' => 'alimentaire', 'unit' => 'kg', 'unit_cost' => $cost, 'quantity_in_stock' => $stock, 'min_threshold' => 5]);
    }

    private function order(Product $a, float $qty, float $price): PurchaseOrder
    {
        $this->actingAs($this->admin)->post(route('admin.purchase-orders.store'), [
            'supplier_id' => $this->supplier->id,
            'lines' => [['product_id' => $a->id, 'quantity' => $qty, 'unit_cost' => $price]],
        ])->assertRedirect();

        return PurchaseOrder::firstOrFail();
    }

    public function test_an_order_is_numbered_totalled_and_received_in_two_deliveries(): void
    {
        $flour = $this->product('Farine', 2, 400);
        $order = $this->order($flour, 100, 500);

        $this->assertMatchesRegularExpression('/^BC-\d{4}-0001$/', $order->number);
        $this->assertSame('brouillon', $order->status);
        $this->assertSame(50000.0, $order->fresh('lines')->total);

        $this->actingAs($this->admin)->post(route('admin.purchase-orders.send', $order))->assertSessionHas('success');
        $this->assertSame('envoye', $order->fresh()->status);

        $line = $order->lines()->first();
        $this->actingAs($this->admin)->post(route('admin.purchase-orders.receive', $order), ['received' => [$line->id => 60]])->assertSessionHas('success');

        $this->assertSame('partiel', $order->fresh()->status);
        $this->assertEquals(62, $flour->fresh()->quantity_in_stock);
        // Coût moyen pondéré : (2 × 400 + 60 × 500) / 62
        $this->assertEquals(496.77, (float) $flour->fresh()->unit_cost);

        $this->actingAs($this->admin)->post(route('admin.purchase-orders.receive', $order), ['received' => [$line->id => 40]]);
        $this->assertSame('recu', $order->fresh()->status);
        $this->assertEquals(102, $flour->fresh()->quantity_in_stock);
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public function test_receiving_more_than_ordered_is_refused_and_changes_nothing(): void
    {
        $rice = $this->product('Riz');
        $order = $this->order($rice, 10, 700);
        $this->actingAs($this->admin)->post(route('admin.purchase-orders.send', $order));
        $line = $order->lines()->first();

        $this->actingAs($this->admin)->post(route('admin.purchase-orders.receive', $order), ['received' => [$line->id => 11]])->assertSessionHasErrors('lines');

        $this->assertEquals(0, $rice->fresh()->quantity_in_stock);
        $this->assertSame('envoye', $order->fresh()->status);
    }

    public function test_the_received_value_becomes_one_purchase_expense(): void
    {
        $oil = $this->product('Huile');
        $order = $this->order($oil, 10, 1500);
        $this->actingAs($this->admin)->post(route('admin.purchase-orders.send', $order));
        $line = $order->lines()->first();
        $this->actingAs($this->admin)->post(route('admin.purchase-orders.receive', $order), ['received' => [$line->id => 4]]);

        $this->actingAs($this->admin)->post(route('admin.purchase-orders.expense', $order), ['payment_method' => 'especes'])->assertSessionHas('success');
        $this->assertEquals(6000, Expense::where('category', 'achats')->sum('amount'));

        $this->actingAs($this->admin)->post(route('admin.purchase-orders.expense', $order), ['payment_method' => 'especes'])->assertSessionHasErrors('expense');
        $this->assertSame(1, Expense::where('category', 'achats')->count());
    }

    public function test_a_supply_request_is_approved_then_delivered_out_of_stock(): void
    {
        $sugar = $this->product('Sucre', 20, 600);

        $this->actingAs($this->admin)->post(route('admin.supply-requests.store'), [
            'purpose' => 'Atelier pâtisserie',
            'lines' => [['product_id' => $sugar->id, 'quantity' => 8]],
        ])->assertRedirect();
        $request = SupplyRequest::firstOrFail();
        $this->assertSame('en_attente', $request->status);
        $this->assertMatchesRegularExpression('/^DM-\d{4}-0001$/', $request->number);

        // Livrer avant d'approuver est refusé.
        $this->actingAs($this->admin)->post(route('admin.supply-requests.deliver', $request))->assertSessionHasErrors('status');

        $this->actingAs($this->admin)->post(route('admin.supply-requests.approve', $request));
        $this->actingAs($this->admin)->post(route('admin.supply-requests.deliver', $request))->assertSessionHas('success');

        $this->assertSame('livree', $request->fresh()->status);
        $this->assertEquals(12, $sugar->fresh()->quantity_in_stock);
    }

    public function test_a_delivery_with_missing_stock_is_refused_in_full(): void
    {
        $butter = $this->product('Beurre', 3);
        $salt = $this->product('Sel', 50);

        $this->actingAs($this->admin)->post(route('admin.supply-requests.store'), [
            'purpose' => 'Atelier',
            'lines' => [['product_id' => $salt->id, 'quantity' => 5], ['product_id' => $butter->id, 'quantity' => 10]],
        ]);
        $request = SupplyRequest::firstOrFail();
        $this->actingAs($this->admin)->post(route('admin.supply-requests.approve', $request));

        $this->actingAs($this->admin)->post(route('admin.supply-requests.deliver', $request))->assertSessionHasErrors('status');

        $this->assertSame('approuvee', $request->fresh()->status);
        $this->assertEquals(50, $salt->fresh()->quantity_in_stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_the_inventory_only_corrects_the_gaps(): void
    {
        $a = $this->product('Farine', 10, 400);
        $b = $this->product('Sucre', 5, 600);

        $this->actingAs($this->admin)->post(route('admin.inventory.store'), ['counted' => [$a->id => 7, $b->id => 5]])->assertSessionHas('success');

        $this->assertEquals(7, $a->fresh()->quantity_in_stock);
        $this->assertEquals(5, $b->fresh()->quantity_in_stock);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_the_dashboard_summarises_stock_orders_and_requests(): void
    {
        $this->product('Farine', 2, 1000);
        $this->product('Riz', 0, 500);
        $this->actingAs($this->admin)->get(route('admin.economat.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Economat/Dashboard')
            ->where('kpis.stockValue', fn ($v) => (float) $v === 2000.0)
            ->where('kpis.low', 1)
            ->where('kpis.empty', 1)
            ->has('toReorder', 2));
    }

    public function test_a_user_without_the_stock_permission_cannot_open_the_module(): void
    {
        $user = User::factory()->create();
        $user->assignRole(\Spatie\Permission\Models\Role::firstOrCreate(['name' => 'sans-droit-test', 'guard_name' => 'web']));

        foreach (['admin.economat.dashboard', 'admin.purchase-orders.index', 'admin.supply-requests.index', 'admin.inventory.index'] as $route) {
            $this->actingAs($user)->get(route($route))->assertForbidden();
        }
    }
}

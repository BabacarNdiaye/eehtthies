<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Le canal (Wave, Orange Money, chèque…) précise la famille « method », qui reste l'enum d'origine : aucune
            // table à reconstruire, et les anciens paiements gardent leur valeur.
            $table->string('channel', 30)->nullable()->after('method');
            // Ce qu'il restait à payer sur la facture juste après ce paiement : le reçu reste juste même si la facture
            // évolue ensuite (null pour les anciens paiements).
            $table->decimal('balance_after', 12, 2)->nullable()->after('amount');
            // Jeton commun aux paiements d'un même encaissement (un reçu pour plusieurs factures) ; il fait aussi
            // l'adresse du QR code de vérification.
            $table->string('batch_token', 40)->nullable()->index()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['batch_token']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['channel', 'balance_after', 'batch_token']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Séance commune : les conseils de plusieurs classes tenus ensemble (même date, salle, président, secrétaire, visio).
 * Chaque classe garde son conseil (photo, décisions, procès-verbal, validation) ; la séance ne fait que les regrouper.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Étapes sautées si déjà faites : une reprise après un échec à mi-chemin ne bloque pas le cron de déploiement.
        if (! Schema::hasTable('council_sittings')) {
            Schema::create('council_sittings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained()->restrictOnDelete();
                $table->string('term', 50);
                $table->boolean('is_end_of_year')->default(false);
                $table->dateTime('scheduled_at')->nullable();
                $table->string('room', 150)->nullable();
                $table->text('agenda')->nullable();
                $table->foreignId('president_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('secretary_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('councils', 'council_sitting_id')) {
            Schema::table('councils', function (Blueprint $table) {
                $table->foreignId('council_sitting_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('councils', 'council_sitting_id')) {
            Schema::table('councils', function (Blueprint $table) {
                $table->dropConstrainedForeignId('council_sitting_id');
            });
        }
        Schema::dropIfExists('council_sittings');
    }
};

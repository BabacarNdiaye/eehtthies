<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Procès-verbaux définitifs du conseil (une ligne par version : v1 à la clôture, v2… par rectification) et circuit de
     * validation. Le PDF est stocké sur le disque privé, son empreinte SHA-256 enregistrée ; il n'est jamais régénéré.
     */
    public function up(): void
    {
        Schema::create('council_minutes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('version');
            $table->string('number', 40);
            $table->string('file_path');
            // Empreinte du fichier PDF (contrôle d'intégrité) et du contenu (imprimée en pied de page du PV).
            $table->char('sha256', 64);
            $table->char('content_hash', 64);
            $table->dateTime('generated_at');
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('signed_scan_path')->nullable();
            $table->dateTime('signed_scan_uploaded_at')->nullable();
            $table->text('rectification_reason')->nullable();
            $table->timestamps();

            $table->unique(['council_id', 'version']);
        });

        Schema::create('council_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            // submission | pedagogical | direction
            $table->string('step', 20);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // submitted | approved | returned
            $table->string('action', 20);
            $table->text('comment')->nullable();
            $table->dateTime('acted_at');
            $table->timestamps();

            $table->index(['council_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('council_validations');
        Schema::dropIfExists('council_minutes');
    }
};

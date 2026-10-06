<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Référentiels du module Conseil de classe (paramétrage, écran E12). Catégories, niveaux d'alerte et couleurs sont
     * des chaînes validées par des constantes PHP, jamais des enum MySQL : en ajouter un ne doit pas exiger de migration.
     */
    public function up(): void
    {
        Schema::create('decision_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 60)->unique();
            $table->string('label');
            // distinction | alert | support | orientation (DecisionType::CATEGORIES)
            $table->string('category', 20);
            // Nom d'une teinte de la palette (DecisionType::TONES), pas une couleur libre : contrastes maîtrisés.
            $table->string('color', 20)->default('ink');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_published_on_report')->default(true);
            $table->boolean('is_end_of_year_only')->default(false);
            $table->boolean('requires_vote')->default(false);
            $table->boolean('creates_follow_up')->default(false);
            $table->boolean('requires_reason')->default(false);
            // Correspondance avec les valeurs déjà utilisées par le bulletin (report_cards.mention / .decision).
            $table->string('report_mention', 30)->nullable();
            $table->string('report_decision', 30)->nullable();
            $table->timestamps();

            $table->index(['category', 'sort_order']);
        });

        // Une paire = une ligne, rangée dans l'ordre croissant des identifiants (voir DecisionType::pairKey) : la
        // règle est symétrique, la lire dans les deux sens.
        Schema::create('decision_type_incompatibilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('decision_type_id')->constrained('decision_types')->cascadeOnDelete();
            $table->foreignId('incompatible_type_id')->constrained('decision_types')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['decision_type_id', 'incompatible_type_id'], 'decision_incompatibility_pair');
        });

        // Seuils des pastilles d'alerte (RG-06). formation_id nul = valeurs par défaut de l'école ; une ligne propre à une
        // formation les remplace pour ce niveau. MySQL accepte plusieurs NULL dans un index unique : l'unicité du jeu par
        // défaut est donc tenue par l'application (AlertThreshold::saveFor).
        Schema::create('alert_thresholds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('level', 10); // orange | red
            // Moyenne générale strictement inférieure à ce seuil.
            $table->decimal('max_average', 4, 2)->nullable();
            // Heures d'absence non justifiée : « à partir de » pour l'orange, « plus de » pour le rouge.
            $table->decimal('unjustified_absence_hours', 5, 1)->nullable();
            // Nombre de matières sous 10 : ce nombre ou davantage.
            $table->unsignedSmallInteger('failed_subjects_count')->nullable();
            // Baisse de la moyenne par rapport à la période précédente, en points : cette baisse ou davantage.
            $table->decimal('progression_drop', 4, 2)->nullable();
            // Niveau de sanction (DisciplineRecord::LEVELS) à partir duquel la pastille se déclenche.
            $table->string('sanction_level', 30)->nullable();
            $table->timestamps();

            $table->unique(['formation_id', 'level']);
        });

        Schema::create('subject_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('label');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->foreignId('subject_group_id')->nullable()->after('coefficient')->constrained('subject_groups')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subject_group_id');
        });

        Schema::dropIfExists('subject_groups');
        Schema::dropIfExists('alert_thresholds');
        Schema::dropIfExists('decision_type_incompatibilities');
        Schema::dropIfExists('decision_types');
    }
};

<?php

namespace App\Support;

use App\Models\AlertThreshold;
use App\Models\AppreciationTemplate;
use App\Models\DecisionType;
use App\Models\InternshipCriterion;
use App\Models\SubjectGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiels de départ du conseil de classe : types de décision, incompatibilités, seuils d'alerte (valeurs par défaut
 * du cahier des charges, RG-06) et groupes de matières. « À ajuster par EEHT » : tout se règle ensuite dans l'écran des
 * paramètres du module.
 *
 * install() ne CRÉE que ce qui manque (par code) et n'écrase jamais une valeur : l'appeler deux fois, ou après que l'école
 * a modifié ses réglages, ne change rien. En production aucun seeder n'est relancé ; la migration l'appelle.
 */
class CouncilDefaults
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function decisionTypes(): array
    {
        $type = fn (string $code, string $label, string $category, string $color, array $flags = []): array => array_merge([
            'code' => $code, 'label' => $label, 'category' => $category, 'color' => $color,
            'is_published_on_report' => true, 'is_end_of_year_only' => $category === DecisionType::ORIENTATION,
            'requires_vote' => false, 'creates_follow_up' => false, 'requires_reason' => false,
            'report_mention' => null, 'report_decision' => null,
        ], $flags);

        return [
            $type('felicitations', 'Félicitations', DecisionType::DISTINCTION, 'emerald', ['report_mention' => 'felicitations']),
            $type('encouragements', 'Encouragements', DecisionType::DISTINCTION, 'sky', ['report_mention' => 'encouragement']),
            $type('tableau_honneur', "Tableau d'honneur", DecisionType::DISTINCTION, 'violet', ['report_mention' => 'tableau_honneur']),

            $type('avertissement_travail', 'Avertissement de travail', DecisionType::ALERT, 'amber', ['requires_reason' => true, 'report_mention' => 'avertissement']),
            $type('avertissement_conduite', 'Avertissement de conduite', DecisionType::ALERT, 'orange', ['requires_reason' => true, 'report_mention' => 'avertissement']),
            $type('blame', 'Blâme', DecisionType::ALERT, 'red', ['requires_reason' => true, 'report_mention' => 'blame']),

            $type('soutien', 'Soutien pédagogique', DecisionType::SUPPORT, 'sky', ['creates_follow_up' => true, 'is_published_on_report' => false]),
            $type('entretien_famille', 'Entretien avec la famille', DecisionType::SUPPORT, 'violet', ['creates_follow_up' => true, 'is_published_on_report' => false]),
            $type('suivi_vie_scolaire', 'Suivi par la vie scolaire', DecisionType::SUPPORT, 'ink', ['creates_follow_up' => true, 'is_published_on_report' => false]),

            $type('passage', 'Passage en classe supérieure', DecisionType::ORIENTATION, 'emerald', ['report_decision' => 'admis']),
            $type('redoublement', 'Redoublement', DecisionType::ORIENTATION, 'amber', ['requires_reason' => true, 'report_decision' => 'redouble']),
            $type('reorientation', 'Réorientation', DecisionType::ORIENTATION, 'orange', ['requires_reason' => true]),
            $type('exclusion', 'Exclusion', DecisionType::ORIENTATION, 'red', ['requires_reason' => true, 'requires_vote' => true, 'report_decision' => 'exclu']),
        ];
    }

    /** Paires d'exemple de la table d'incompatibilités (la règle « distinction ⟂ alerte » est, elle, codée : RG-09). */
    public const INCOMPATIBILITIES = [
        ['felicitations', 'avertissement_travail'],
        ['felicitations', 'avertissement_conduite'],
    ];

    /**
     * Seuils par défaut (RG-06). Rouge : moyenne < 10, plus de 20 h d'absence non justifiée, 4 matières ou plus < 10,
     * sanction d'exclusion. Orange : moyenne < 12 (donc de 10 à 11,99 une fois le rouge écarté), 10 h d'absence ou plus,
     * 2 matières ou plus < 10, baisse de 2 points ou plus.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function thresholds(): array
    {
        return [
            AlertThreshold::RED => [
                'max_average' => 10, 'unjustified_absence_hours' => 20, 'failed_subjects_count' => 4,
                'progression_drop' => null, 'sanction_level' => 'exclusion',
            ],
            AlertThreshold::ORANGE => [
                'max_average' => 12, 'unjustified_absence_hours' => 10, 'failed_subjects_count' => 2,
                'progression_drop' => 2, 'sanction_level' => null,
            ],
        ];
    }

    /** Groupes de matières : code => libellé, dans l'ordre d'affichage. */
    public const SUBJECT_GROUPS = [
        'general' => 'Enseignement général',
        'professionnel' => 'Enseignement professionnel',
        'tp' => 'Travaux pratiques',
        SubjectGroup::INTERNSHIP => 'Stage',
    ];

    /** Banque d'appréciations de départ (PAR-06) : [niveau, thème, texte]. */
    public const APPRECIATIONS = [
        ['excellent', 'travail', 'Excellent travail, rigoureux et régulier. Félicitations.'],
        ['excellent', 'comportement', 'Attitude exemplaire, moteur pour la classe.'],
        ['bien', 'travail', 'Bon travail d’ensemble ; continuez ainsi.'],
        ['bien', 'progression', 'Progrès nets ce semestre : efforts à poursuivre.'],
        ['moyen', 'travail', 'Résultats justes : un travail plus régulier permettrait de progresser.'],
        ['moyen', 'comportement', 'Des capacités, mais la concentration en cours doit s’améliorer.'],
        ['insuffisant', 'travail', 'Résultats insuffisants : un travail personnel sérieux est indispensable.'],
        ['insuffisant', 'comportement', 'Attitude à revoir : retards et manque d’implication pénalisent les résultats.'],
        ['insuffisant', 'progression', 'Semestre en recul : un sursaut est attendu dès maintenant.'],
    ];

    /** Grille d'évaluation de stage de départ (PAR-07). */
    public const INTERNSHIP_CRITERIA = [
        'Présentation et tenue professionnelle',
        'Ponctualité et assiduité',
        'Maîtrise des gestes professionnels',
        'Relation avec la clientèle',
        'Travail en équipe',
        'Initiative et autonomie',
    ];

    public static function install(): void
    {
        DB::transaction(function () {
            foreach (self::decisionTypes() as $position => $attributes) {
                DecisionType::firstOrCreate(['code' => $attributes['code']], $attributes + ['sort_order' => ($position + 1) * 10]);
            }

            foreach (self::INCOMPATIBILITIES as [$first, $second]) {
                $ids = DecisionType::whereIn('code', [$first, $second])->pluck('id', 'code');

                if ($ids->count() !== 2) {
                    continue;
                }

                [$low, $high] = DecisionType::pairKey($ids[$first], $ids[$second]);
                DB::table('decision_type_incompatibilities')->insertOrIgnore([
                    'decision_type_id' => $low, 'incompatible_type_id' => $high, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            foreach (self::thresholds() as $level => $values) {
                AlertThreshold::firstOrCreate(['formation_id' => null, 'level' => $level], $values);
            }

            $order = 0;
            foreach (self::SUBJECT_GROUPS as $code => $label) {
                SubjectGroup::firstOrCreate(['code' => $code], ['label' => $label, 'sort_order' => (++$order) * 10]);
            }

            // Lot V2 : tables absentes tant que leur migration n'a pas tourné (la première installation les précède).
            if (Schema::hasTable('appreciation_templates')) {
                foreach (self::APPRECIATIONS as $position => [$level, $theme, $text]) {
                    AppreciationTemplate::firstOrCreate(['level' => $level, 'theme' => $theme, 'text' => $text], ['sort_order' => $position]);
                }
            }

            if (Schema::hasTable('internship_criteria')) {
                foreach (self::INTERNSHIP_CRITERIA as $position => $label) {
                    InternshipCriterion::firstOrCreate(['label' => $label], ['sort_order' => ($position + 1) * 10]);
                }
            }
        });
    }
}

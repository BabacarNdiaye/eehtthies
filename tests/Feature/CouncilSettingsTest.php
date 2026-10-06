<?php

namespace Tests\Feature;

use App\Models\AlertThreshold;
use App\Models\DecisionType;
use App\Models\Formation;
use App\Models\Setting;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Models\User;
use App\Support\CouncilDefaults;
use App\Support\CouncilSettings;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Paramétrage du conseil de classe (écran E12) : types de décision et leurs incompatibilités (PAR-01 à PAR-03), seuils
 * d'alerte par formation (PAR-04), groupes de matières (PAR-05), règles de validation et de recours (PAR-09, RG-20).
 */
class CouncilSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function direction(): User
    {
        return $this->userWithRole('direction');
    }

    private function type(string $code): DecisionType
    {
        return DecisionType::where('code', $code)->firstOrFail();
    }

    private function formation(string $name = 'BTS Cuisine'): Formation
    {
        return Formation::create(['name' => $name, 'code' => 'F-'.uniqid(), 'slug' => 'f-'.uniqid()]);
    }

    private function newType(array $overrides = []): array
    {
        return $overrides + [
            'code' => 'mention_speciale', 'label' => 'Mention spéciale', 'category' => 'distinction', 'color' => 'emerald',
            'is_active' => true, 'is_published_on_report' => true, 'is_end_of_year_only' => false, 'requires_vote' => false,
            'creates_follow_up' => false, 'requires_reason' => false, 'report_mention' => null, 'report_decision' => null,
        ];
    }

    // --- Accès ----------------------------------------------------------------------------------------------------------

    public function test_direction_and_the_pedagogical_manager_open_the_settings(): void
    {
        foreach (['direction', 'responsable-pedagogique', 'super-admin'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('admin.council-settings.index'))->assertOk();
        }
    }

    public function test_other_roles_cannot_open_nor_change_the_settings(): void
    {
        foreach (['vie-scolaire', 'secretariat', 'comptable', 'enseignant'] as $role) {
            $user = $this->userWithRole($role);

            $this->actingAs($user)->get(route('admin.council-settings.index'))->assertForbidden();
            $this->actingAs($user)->post(route('admin.council-settings.decision-types.store'), $this->newType())->assertForbidden();
            $this->actingAs($user)->put(route('admin.council-settings.rules.update'), ['double_validation' => false, 'appeal_days' => 8, 'default_absence_hours' => 1])->assertForbidden();
        }

        $this->assertFalse(DecisionType::where('code', 'mention_speciale')->exists());
        $this->assertTrue(CouncilSettings::doubleValidation());
    }

    public function test_the_page_carries_every_reference_list(): void
    {
        $this->actingAs($this->direction())->get(route('admin.council-settings.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/CouncilSettings/Index')
            ->has('decisionTypes', 13)
            ->has('decisionTypes.0.incompatible_ids')
            ->where('categories.distinction', 'Distinction')
            ->has('tones')
            ->where('thresholds.default.red.max_average', 10)
            ->where('thresholds.default.orange.max_average', 12)
            ->has('formations')
            ->has('sanctionLevels')
            ->has('subjectGroups', 4)
            ->has('subjects')
            ->where('rules.double_validation', true)
            ->where('rules.appeal_days', 8));
    }

    // --- Référentiels de départ -----------------------------------------------------------------------------------------

    public function test_the_starting_references_come_with_the_migration(): void
    {
        $perCategory = DecisionType::selectRaw('category, count(*) as total')->groupBy('category')->pluck('total', 'category')
            ->map(fn ($total) => (int) $total)->sortKeys()->all();

        $this->assertSame(['alert' => 3, 'distinction' => 3, 'orientation' => 4, 'support' => 3], $perCategory);
        $this->assertSame(['general', 'professionnel', 'stage', 'tp'], SubjectGroup::orderBy('code')->pluck('code')->all());
        $this->assertSame([AlertThreshold::ORANGE, AlertThreshold::RED], AlertThreshold::whereNull('formation_id')->orderBy('level')->pluck('level')->all());
    }

    public function test_orientation_decisions_are_for_the_end_of_the_year_only(): void
    {
        foreach (['passage', 'redoublement', 'reorientation', 'exclusion'] as $code) {
            $this->assertTrue($this->type($code)->is_end_of_year_only, "{$code} doit être réservé à la fin d'année.");
        }
        $this->assertFalse($this->type('felicitations')->is_end_of_year_only);
    }

    public function test_a_reason_is_required_for_every_alert_and_every_orientation_but_the_pass(): void
    {
        foreach (DecisionType::where('category', 'alert')->get() as $type) {
            $this->assertTrue($type->requires_reason, "{$type->code} exige un motif (DEC-04).");
        }
        $this->assertFalse($this->type('passage')->requires_reason);
        foreach (['redoublement', 'reorientation', 'exclusion'] as $code) {
            $this->assertTrue($this->type($code)->requires_reason);
        }
    }

    public function test_support_decisions_create_a_follow_up_action(): void
    {
        foreach (DecisionType::where('category', 'support')->get() as $type) {
            $this->assertTrue($type->creates_follow_up, "{$type->code} crée une action de suivi (DEC-06).");
        }
    }

    public function test_the_default_thresholds_are_the_ones_of_the_specification(): void
    {
        $red = AlertThreshold::whereNull('formation_id')->where('level', 'red')->firstOrFail();
        $orange = AlertThreshold::whereNull('formation_id')->where('level', 'orange')->firstOrFail();

        $this->assertSame([10.0, 20.0, 4, null, 'exclusion'], [$red->max_average, $red->unjustified_absence_hours, $red->failed_subjects_count, $red->progression_drop, $red->sanction_level]);
        $this->assertSame([12.0, 10.0, 2, 2.0, null], [$orange->max_average, $orange->unjustified_absence_hours, $orange->failed_subjects_count, $orange->progression_drop, $orange->sanction_level]);
    }

    public function test_installing_the_references_again_changes_nothing_and_never_overwrites(): void
    {
        $this->type('blame')->update(['label' => 'Blâme de la direction', 'is_active' => false]);
        AlertThreshold::whereNull('formation_id')->where('level', 'red')->update(['max_average' => 9]);
        SubjectGroup::where('code', 'tp')->update(['label' => 'Ateliers']);
        $types = DecisionType::count();

        CouncilDefaults::install();
        CouncilDefaults::install();

        $this->assertSame($types, DecisionType::count());
        $this->assertSame('Blâme de la direction', $this->type('blame')->label);
        $this->assertFalse($this->type('blame')->is_active);
        $this->assertSame(9.0, AlertThreshold::whereNull('formation_id')->where('level', 'red')->value('max_average'));
        $this->assertSame('Ateliers', SubjectGroup::where('code', 'tp')->value('label'));
        $this->assertSame(2, AlertThreshold::whereNull('formation_id')->count(), 'Pas de doublon du jeu par défaut.');
    }

    public function test_installing_the_references_restores_one_that_was_deleted(): void
    {
        $this->type('soutien')->delete();

        CouncilDefaults::install();

        $this->assertTrue(DecisionType::where('code', 'soutien')->exists());
    }

    // --- Types de décision ----------------------------------------------------------------------------------------------

    public function test_a_decision_type_is_created_at_the_end_of_its_category(): void
    {
        $this->actingAs($this->direction())->post(route('admin.council-settings.decision-types.store'), $this->newType())
            ->assertRedirect()->assertSessionHasNoErrors();

        $type = $this->type('mention_speciale');
        $this->assertSame('Mention spéciale', $type->label);
        $this->assertTrue($type->is_active);
        $this->assertGreaterThan(DecisionType::where('category', 'distinction')->where('id', '!=', $type->id)->max('sort_order'), $type->sort_order);
    }

    public function test_an_orientation_type_is_always_reserved_to_the_end_of_the_year(): void
    {
        $this->actingAs($this->direction())->post(route('admin.council-settings.decision-types.store'), $this->newType([
            'code' => 'mutation', 'label' => 'Mutation', 'category' => 'orientation', 'is_end_of_year_only' => false,
        ]))->assertSessionHasNoErrors();

        $this->assertTrue($this->type('mutation')->is_end_of_year_only, "RG-10 : une orientation n'est proposée qu'en fin d'année.");
    }

    public function test_invalid_decision_types_are_refused(): void
    {
        $user = $this->direction();
        $store = fn (array $overrides) => $this->actingAs($user)->post(route('admin.council-settings.decision-types.store'), $this->newType($overrides));

        $store(['code' => 'blame'])->assertSessionHasErrors('code');
        $store(['code' => 'Code Invalide'])->assertSessionHasErrors('code');
        $store(['label' => ''])->assertSessionHasErrors('label');
        $store(['category' => 'sanction'])->assertSessionHasErrors('category');
        $store(['color' => '#ff00ff'])->assertSessionHasErrors('color');
        $store(['report_mention' => 'bravo'])->assertSessionHasErrors('report_mention');
        $store(['report_decision' => 'promu'])->assertSessionHasErrors('report_decision');

        $this->assertFalse(DecisionType::where('code', 'mention_speciale')->exists());
    }

    public function test_a_decision_type_can_be_renamed_and_deactivated_but_keeps_its_code(): void
    {
        $type = $this->type('soutien');

        $this->actingAs($this->direction())->patch(route('admin.council-settings.decision-types.update', $type), $this->newType([
            'code' => 'autre_code', 'label' => 'Tutorat', 'category' => 'support', 'is_active' => false, 'creates_follow_up' => true,
        ]))->assertSessionHasNoErrors();

        $type->refresh();
        $this->assertSame('soutien', $type->code, 'Le code est la clé : il ne change pas.');
        $this->assertSame('Tutorat', $type->label);
        $this->assertFalse($type->is_active);
    }

    public function test_an_unused_decision_type_can_be_deleted_with_its_incompatibilities(): void
    {
        $type = $this->type('felicitations');
        $this->assertNotEmpty($type->incompatibleIds());

        $this->actingAs($this->direction())->delete(route('admin.council-settings.decision-types.destroy', $type))->assertRedirect();

        $this->assertFalse(DecisionType::where('code', 'felicitations')->exists());
        $remaining = DecisionType::pluck('id');
        $this->assertSame(0, DB::table('decision_type_incompatibilities')
            ->where(fn ($query) => $query->whereNotIn('decision_type_id', $remaining)->orWhereNotIn('incompatible_type_id', $remaining))
            ->count(), 'Aucune paire orpheline.');
        $this->assertSame([], $this->type('avertissement_travail')->incompatibleIds());
    }

    // --- Incompatibilités -----------------------------------------------------------------------------------------------

    public function test_an_incompatibility_is_symmetrical(): void
    {
        $blame = $this->type('blame');
        $encouragements = $this->type('encouragements');

        $this->actingAs($this->direction())
            ->put(route('admin.council-settings.decision-types.incompatibilities', $blame), ['incompatible_ids' => [$encouragements->id]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$encouragements->id], $blame->incompatibleIds());
        $this->assertSame([$blame->id], $encouragements->incompatibleIds());
        $this->assertSame(1, DB::table('decision_type_incompatibilities')->where('decision_type_id', min($blame->id, $encouragements->id))->where('incompatible_type_id', max($blame->id, $encouragements->id))->count());
    }

    public function test_incompatibilities_are_replaced_not_added_to(): void
    {
        $felicitations = $this->type('felicitations');
        $blame = $this->type('blame');

        $this->actingAs($this->direction())
            ->put(route('admin.council-settings.decision-types.incompatibilities', $felicitations), ['incompatible_ids' => [$blame->id]]);

        $this->assertSame([$blame->id], $felicitations->incompatibleIds());
        $this->assertSame([], $this->type('avertissement_travail')->incompatibleIds(), "L'ancienne paire a disparu des deux côtés.");
    }

    public function test_a_type_is_never_incompatible_with_itself_and_unknown_types_are_ignored(): void
    {
        $blame = $this->type('blame');

        $this->actingAs($this->direction())
            ->put(route('admin.council-settings.decision-types.incompatibilities', $blame), ['incompatible_ids' => [$blame->id, 999999]]);

        $this->assertSame([], $blame->incompatibleIds());
    }

    // --- Seuils d'alerte ------------------------------------------------------------------------------------------------

    private function thresholdPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'formation_id' => null,
            'orange' => ['max_average' => 12, 'unjustified_absence_hours' => 10, 'failed_subjects_count' => 2, 'progression_drop' => 2, 'sanction_level' => null],
            'red' => ['max_average' => 10, 'unjustified_absence_hours' => 20, 'failed_subjects_count' => 4, 'progression_drop' => null, 'sanction_level' => 'exclusion'],
        ], $overrides);
    }

    public function test_the_school_wide_thresholds_are_edited_in_place(): void
    {
        $this->actingAs($this->direction())->put(route('admin.council-settings.alert-thresholds.update'), $this->thresholdPayload([
            'red' => ['max_average' => 9, 'unjustified_absence_hours' => 15, 'sanction_level' => 'blame'],
        ]))->assertSessionHasNoErrors();

        $red = AlertThreshold::whereNull('formation_id')->where('level', 'red')->firstOrFail();
        $this->assertSame([9.0, 15.0, 'blame'], [$red->max_average, $red->unjustified_absence_hours, $red->sanction_level]);
        $this->assertSame(2, AlertThreshold::whereNull('formation_id')->count());
    }

    public function test_a_formation_gets_its_own_thresholds_that_replace_the_default_ones(): void
    {
        $formation = $this->formation();
        $other = $this->formation('BTS Tourisme');

        $this->actingAs($this->direction())->put(route('admin.council-settings.alert-thresholds.update'), $this->thresholdPayload([
            'formation_id' => $formation->id,
            'orange' => ['max_average' => 13],
        ]))->assertSessionHasNoErrors();

        $this->assertSame(13.0, AlertThreshold::resolve($formation->id)['orange']->max_average);
        $this->assertSame(12.0, AlertThreshold::resolve($other->id)['orange']->max_average, 'Une autre formation garde les valeurs par défaut.');
        $this->assertSame(12.0, AlertThreshold::resolve(null)['orange']->max_average);
        $this->assertSame(2, AlertThreshold::where('formation_id', $formation->id)->count());
    }

    public function test_resetting_a_formation_gives_back_the_default_thresholds(): void
    {
        $formation = $this->formation();
        AlertThreshold::saveFor($formation->id, 'red', ['max_average' => 8]);
        AlertThreshold::saveFor($formation->id, 'orange', ['max_average' => 11]);

        $this->actingAs($this->direction())->delete(route('admin.council-settings.alert-thresholds.destroy', $formation))->assertRedirect();

        $this->assertSame(0, AlertThreshold::where('formation_id', $formation->id)->count());
        $this->assertSame(10.0, AlertThreshold::resolve($formation->id)['red']->max_average);
        $this->assertSame(2, AlertThreshold::whereNull('formation_id')->count(), 'Le jeu par défaut est intact.');
    }

    public function test_threshold_limits_are_checked(): void
    {
        $user = $this->direction();
        $put = fn (array $overrides) => $this->actingAs($user)->put(route('admin.council-settings.alert-thresholds.update'), $this->thresholdPayload($overrides));

        $put(['red' => ['max_average' => 25]])->assertSessionHasErrors('red.max_average');
        $put(['red' => ['max_average' => -1]])->assertSessionHasErrors('red.max_average');
        $put(['orange' => ['unjustified_absence_hours' => -5]])->assertSessionHasErrors('orange.unjustified_absence_hours');
        $put(['orange' => ['failed_subjects_count' => 99]])->assertSessionHasErrors('orange.failed_subjects_count');
        $put(['orange' => ['progression_drop' => 30]])->assertSessionHasErrors('orange.progression_drop');
        $put(['red' => ['sanction_level' => 'pendaison']])->assertSessionHasErrors('red.sanction_level');
        $put(['formation_id' => 999999])->assertSessionHasErrors('formation_id');

        $this->assertSame(10.0, AlertThreshold::whereNull('formation_id')->where('level', 'red')->value('max_average'));
    }

    public function test_an_empty_threshold_field_means_that_criterion_is_not_used(): void
    {
        $this->actingAs($this->direction())->put(route('admin.council-settings.alert-thresholds.update'), $this->thresholdPayload([
            'orange' => ['progression_drop' => null, 'failed_subjects_count' => null],
        ]))->assertSessionHasNoErrors();

        $orange = AlertThreshold::whereNull('formation_id')->where('level', 'orange')->firstOrFail();
        $this->assertNull($orange->progression_drop);
        $this->assertNull($orange->failed_subjects_count);
    }

    // --- Groupes de matières --------------------------------------------------------------------------------------------

    public function test_a_subject_group_is_created_renamed_and_deleted(): void
    {
        $user = $this->direction();

        $this->actingAs($user)->post(route('admin.council-settings.subject-groups.store'), ['code' => 'langues', 'label' => 'Langues'])
            ->assertSessionHasNoErrors();
        $group = SubjectGroup::where('code', 'langues')->firstOrFail();

        $this->actingAs($user)->patch(route('admin.council-settings.subject-groups.update', $group), ['label' => 'Langues vivantes'])
            ->assertSessionHasNoErrors();
        $this->assertSame('Langues vivantes', $group->fresh()->label);

        $this->actingAs($user)->delete(route('admin.council-settings.subject-groups.destroy', $group))->assertRedirect();
        $this->assertFalse(SubjectGroup::where('code', 'langues')->exists());
    }

    public function test_a_subject_group_code_is_unique_and_clean(): void
    {
        $user = $this->direction();

        $this->actingAs($user)->post(route('admin.council-settings.subject-groups.store'), ['code' => 'tp', 'label' => 'Doublon'])->assertSessionHasErrors('code');
        $this->actingAs($user)->post(route('admin.council-settings.subject-groups.store'), ['code' => 'Mauvais Code', 'label' => 'X'])->assertSessionHasErrors('code');
        $this->actingAs($user)->post(route('admin.council-settings.subject-groups.store'), ['code' => 'ok', 'label' => ''])->assertSessionHasErrors('label');
    }

    public function test_deleting_a_group_leaves_its_subjects_unclassified(): void
    {
        $group = SubjectGroup::where('code', 'tp')->firstOrFail();
        $subject = Subject::create(['name' => 'Atelier cuisine', 'coefficient' => 2, 'subject_group_id' => $group->id]);

        $this->actingAs($this->direction())->delete(route('admin.council-settings.subject-groups.destroy', $group));

        $this->assertNull($subject->fresh()->subject_group_id);
        $this->assertSame('Atelier cuisine', $subject->fresh()->name);
    }

    public function test_subjects_are_assigned_to_groups_in_one_go(): void
    {
        $general = SubjectGroup::where('code', 'general')->firstOrFail();
        $tp = SubjectGroup::where('code', 'tp')->firstOrFail();
        $anglais = Subject::create(['name' => 'Anglais', 'coefficient' => 1]);
        $cuisine = Subject::create(['name' => 'Cuisine', 'coefficient' => 3, 'subject_group_id' => $general->id]);
        $gestion = Subject::create(['name' => 'Gestion', 'coefficient' => 2, 'subject_group_id' => $general->id]);

        $this->actingAs($this->direction())->put(route('admin.council-settings.subject-groups.assign'), ['assignments' => [
            ['subject_id' => $anglais->id, 'subject_group_id' => $general->id],
            ['subject_id' => $cuisine->id, 'subject_group_id' => $tp->id],
            ['subject_id' => $gestion->id, 'subject_group_id' => null],
        ]])->assertSessionHasNoErrors();

        $this->assertSame($general->id, $anglais->fresh()->subject_group_id);
        $this->assertSame($tp->id, $cuisine->fresh()->subject_group_id);
        $this->assertNull($gestion->fresh()->subject_group_id);
    }

    public function test_an_assignment_to_an_unknown_group_or_subject_is_refused(): void
    {
        $subject = Subject::create(['name' => 'Anglais', 'coefficient' => 1]);
        $user = $this->direction();

        $this->actingAs($user)->put(route('admin.council-settings.subject-groups.assign'), ['assignments' => [
            ['subject_id' => $subject->id, 'subject_group_id' => 999999],
        ]])->assertSessionHasErrors('assignments.0.subject_group_id');

        $this->actingAs($user)->put(route('admin.council-settings.subject-groups.assign'), ['assignments' => [
            ['subject_id' => 999999, 'subject_group_id' => null],
        ]])->assertSessionHasErrors('assignments.0.subject_id');
    }

    // --- Règles de validation et de recours -----------------------------------------------------------------------------

    public function test_the_rules_start_with_the_double_validation_and_an_eight_day_appeal(): void
    {
        $this->assertTrue(CouncilSettings::doubleValidation());
        $this->assertSame(8, CouncilSettings::appealDays());
        $this->assertSame(1.0, CouncilSettings::defaultAbsenceHours());
    }

    public function test_the_rules_are_saved_and_read_back(): void
    {
        $this->actingAs($this->direction())->put(route('admin.council-settings.rules.update'), [
            'double_validation' => false, 'appeal_days' => 15, 'default_absence_hours' => 2,
        ])->assertSessionHasNoErrors();

        $this->assertFalse(CouncilSettings::doubleValidation());
        $this->assertSame(15, CouncilSettings::appealDays());
        $this->assertSame(2.0, CouncilSettings::defaultAbsenceHours());
        $this->assertSame('conseils', Setting::where('key', 'conseils_appeal_days')->value('group'));
    }

    public function test_the_vote_rules_are_saved_and_bounded(): void
    {
        $user = $this->direction();
        $put = fn (array $overrides) => $this->actingAs($user)->put(route('admin.council-settings.vote-rules.update'), $overrides + [
            'vote_functions' => ['president', 'main_teacher', 'teacher', 'school_life'],
            'vote_majority' => 'absolute_present', 'vote_casting' => false, 'vote_secrecy' => 'secret', 'vote_mode' => 'show_of_hands',
        ]);

        $put([])->assertSessionHasNoErrors();
        $this->assertSame(['president', 'main_teacher', 'teacher', 'school_life'], CouncilSettings::voteFunctions());
        $this->assertSame('absolute_present', CouncilSettings::voteMajority());
        $this->assertFalse(CouncilSettings::voteCasting());
        $this->assertSame('secret', CouncilSettings::voteSecrecy());
        $this->assertSame('show_of_hands', CouncilSettings::voteMode());
        $this->assertTrue(CouncilSettings::doubleValidation(), 'Les règles du PV ne bougent pas.');

        $put(['vote_functions' => []])->assertSessionHasErrors('vote_functions');
        $put(['vote_functions' => ['eleve']])->assertSessionHasErrors('vote_functions.0');
        $put(['vote_majority' => 'unanimity'])->assertSessionHasErrors('vote_majority');
        $this->actingAs($this->userWithRole('secretariat'))->put(route('admin.council-settings.vote-rules.update'), ['vote_functions' => ['president']])->assertForbidden();

        $this->actingAs($user)->get(route('admin.council-settings.index'))->assertInertia(fn (Assert $page) => $page
            ->where('rules.vote_majority', 'absolute_present')
            ->has('voteOptions.functions')
            ->has('voteOptions.majorities'));
    }

    public function test_the_rules_are_bounded(): void
    {
        $user = $this->direction();
        $put = fn (array $overrides) => $this->actingAs($user)->put(route('admin.council-settings.rules.update'), $overrides + [
            'double_validation' => true, 'appeal_days' => 8, 'default_absence_hours' => 1,
        ]);

        $put(['appeal_days' => 0])->assertSessionHasErrors('appeal_days');
        $put(['appeal_days' => 400])->assertSessionHasErrors('appeal_days');
        $put(['default_absence_hours' => 0])->assertSessionHasErrors('default_absence_hours');
        $put(['default_absence_hours' => 12])->assertSessionHasErrors('default_absence_hours');
        $put(['double_validation' => 'peut-être'])->assertSessionHasErrors('double_validation');

        $this->assertSame(8, CouncilSettings::appealDays());
    }

    // --- Journal --------------------------------------------------------------------------------------------------------

    public function test_a_change_to_a_reference_is_written_to_the_activity_log(): void
    {
        $type = $this->type('soutien');

        $this->actingAs($this->direction())->patch(route('admin.council-settings.decision-types.update', $type), $this->newType([
            'code' => 'soutien', 'label' => 'Tutorat', 'category' => 'support', 'creates_follow_up' => true,
        ]));

        $entry = Activity::where('log_name', 'conseils')->where('event', 'updated')->latest('id')->firstOrFail();
        $this->assertSame('Tutorat', $entry->attribute_changes['attributes']['label']);
        $this->assertSame('Soutien pédagogique', $entry->attribute_changes['old']['label']);
    }
}

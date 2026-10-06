<?php

namespace Tests\Feature;

use App\Models\Council;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * Matrice des droits du conseil (§2.2), profil par profil. Les fonctions de président, professeur principal et
 * secrétaire ne valent que pour LEUR conseil.
 */
class CouncilPolicyTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private Council $council;

    private User $president;

    private User $mainTeacher;

    private User $secretary;

    private User $memberTeacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();

        $this->president = $this->staff('responsable-pedagogique', 'Président');
        $this->mainTeacher = $this->teacher('Principal')[0];
        $this->secretary = $this->staff('secretariat', 'Secrétaire');
        $this->memberTeacher = $this->teacher('Membre')[0];

        $this->council = $this->makeCouncil([
            'president_id' => $this->president->id,
            'main_teacher_id' => $this->mainTeacher->id,
            'secretary_id' => $this->secretary->id,
        ], [['user_id' => $this->memberTeacher->id, 'function' => 'teacher']], $this->president);
    }

    /** @return array<string, User> */
    private function profiles(): array
    {
        return [
            'direction' => $this->staff('direction'),
            'responsable' => $this->staff('responsable-pedagogique'),
            'president' => $this->president,
            'principal' => $this->mainTeacher,
            'enseignant_membre' => $this->memberTeacher,
            'enseignant_etranger' => $this->teacher('Autre')[0],
            'vie_scolaire' => $this->staff('vie-scolaire'),
            'secretariat' => $this->staff('secretariat'),
            'secretaire' => $this->secretary,
            'comptable' => $this->staff('comptable'),
            'eleve' => $this->staff('eleve'),
            'parent' => $this->staff('parent'),
        ];
    }

    /**
     * Profil => abilities accordées ; tout ce qui n'est pas listé est refusé.
     *
     * @return array<string, list<string>>
     */
    private function matrix(): array
    {
        return [
            'direction' => ['view', 'update', 'delete', 'schedule', 'conduct', 'writeSynthesis', 'viewInternal', 'viewDiscipline', 'export', 'submit', 'validatePedagogical', 'validateDirection', 'viewAudit'],
            'responsable' => ['view', 'update', 'delete', 'schedule', 'conduct', 'writeSynthesis', 'viewInternal', 'viewDiscipline', 'export', 'submit', 'validatePedagogical', 'viewAudit'],
            'president' => ['view', 'update', 'delete', 'schedule', 'conduct', 'writeSynthesis', 'viewInternal', 'viewDiscipline', 'export', 'submit', 'validatePedagogical', 'viewAudit'],
            'principal' => ['view', 'writeSynthesis', 'viewInternal', 'viewDiscipline', 'export'],
            'enseignant_membre' => ['view', 'viewInternal'],
            'enseignant_etranger' => [],
            'vie_scolaire' => ['view', 'viewInternal', 'viewDiscipline'],
            'secretariat' => ['view', 'export'],
            'secretaire' => ['view', 'export', 'submit'],
            'comptable' => [],
            'eleve' => [],
            'parent' => [],
        ];
    }

    private const ABILITIES = [
        'view', 'update', 'delete', 'schedule', 'conduct', 'writeSynthesis', 'viewInternal', 'viewDiscipline', 'export',
        'submit', 'validatePedagogical', 'validateDirection', 'viewAudit',
    ];

    public function test_each_profile_gets_exactly_its_rights(): void
    {
        $matrix = $this->matrix();

        foreach ($this->profiles() as $profile => $user) {
            foreach (self::ABILITIES as $ability) {
                $expected = in_array($ability, $matrix[$profile], true);

                $this->assertSame($expected, Gate::forUser($user)->allows($ability, $this->council), sprintf(
                    '« %s » devrait %s « %s ».', $profile, $expected ? 'pouvoir' : 'ne pas pouvoir', $ability
                ));
            }
        }
    }

    public function test_creating_a_council_is_for_direction_and_the_pedagogical_manager(): void
    {
        foreach ($this->profiles() as $profile => $user) {
            $this->assertSame(in_array($profile, ['direction', 'responsable', 'president'], true), Gate::forUser($user)->allows('create', Council::class), $profile);
        }
    }

    public function test_students_and_parents_holding_every_permission_still_get_nothing(): void
    {
        $pupil = $this->staff('eleve');
        $this->assertTrue($pupil->can('voir_conseils'), 'Prémisse : les données de départ donnent tout au rôle élève.');

        $this->assertFalse(Gate::forUser($pupil)->allows('view', $this->council));
        $this->assertFalse(Gate::forUser($pupil)->allows('viewAny', Council::class));
    }

    public function test_a_function_only_counts_for_its_own_council(): void
    {
        $otherClass = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $other = $this->makeCouncil(['school_class_id' => $otherClass->id]);

        $this->assertFalse(Gate::forUser($this->mainTeacher)->allows('view', $other));
        $this->assertFalse(Gate::forUser($this->mainTeacher)->allows('writeSynthesis', $other));
        $this->assertFalse(Gate::forUser($this->memberTeacher)->allows('view', $other));
    }

    public function test_frame_editing_and_deletion_stop_with_the_status(): void
    {
        $direction = $this->staff('direction');

        Council::whereKey($this->council->id)->update(['status' => Council::IN_SESSION]);
        $this->council->refresh();

        $this->assertFalse(Gate::forUser($direction)->allows('update', $this->council));
        $this->assertFalse(Gate::forUser($direction)->allows('delete', $this->council));
        $this->assertTrue(Gate::forUser($direction)->allows('conduct', $this->council));
    }
}

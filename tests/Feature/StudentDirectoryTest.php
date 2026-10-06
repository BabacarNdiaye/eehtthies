<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\Invoice;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Support\StudentDirectory;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * La page « Élèves » n'est plus une longue liste : elle s'ouvre sur un aperçu des promotions rangées par niveau de
 * formation (diplôme), formation, niveau d'année et classe ; la liste des élèves n'apparaît qu'une fois une
 * promotion choisie (ou une recherche lancée). Ces tests décrivent ce que le serveur prépare pour cet écran : l'arbre
 * des promotions avec ses effectifs, la portée choisie, les filtres (année, statut, recherche, dossier incomplet) et
 * la fiche de chaque élève, sans jamais envoyer de données de santé ni de solde à qui n'y a pas droit.
 */
class StudentDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 0;

    private AcademicYear $year;

    private AcademicYear $next;

    private ?User $admin = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->next = AcademicYear::create(['label' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_current' => false]);
    }

    private function staff(string $role): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    /** La direction a toutes les permissions : c'est l'utilisateur par défaut de ces tests. */
    private function admin(): User
    {
        return $this->admin ??= $this->staff('direction');
    }

    private function formation(string $name, ?string $diploma = null): Formation
    {
        return Formation::create(['name' => $name, 'code' => strtoupper(Str::slug($name)), 'diploma' => $diploma]);
    }

    private function level(Formation $formation, int $number, string $label): FormationLevel
    {
        return FormationLevel::create(['formation_id' => $formation->id, 'level_number' => $number, 'label' => $label]);
    }

    private function klass(string $name, Formation $formation, ?FormationLevel $level = null, ?AcademicYear $year = null, ?int $capacity = null): SchoolClass
    {
        return SchoolClass::create([
            'name' => $name,
            'formation_id' => $formation->id,
            'formation_level_id' => $level?->id,
            'academic_year_id' => ($year ?? $this->year)->id,
            'capacity' => $capacity,
        ]);
    }

    private function student(string $last, ?SchoolClass $class = null, string $status = 'actif', array $extra = []): Student
    {
        $this->sequence++;

        return Student::create(array_merge([
            'matricule' => 'M-'.str_pad((string) $this->sequence, 4, '0', STR_PAD_LEFT),
            'first_name' => 'Aminata',
            'last_name' => $last,
            'status' => $status,
            'formation_id' => $class?->formation_id,
            'school_class_id' => $class?->id,
            'academic_year_id' => $class?->academic_year_id,
        ], $extra));
    }

    /** Un petit établissement : quatre diplômes, un niveau par année pour le BTS, une classe sans niveau, une formation courte. */
    private function world(): array
    {
        $cap = $this->formation('CAP Restauration', 'CAP');
        $bts = $this->formation('BTS Tourisme', 'BTS');
        $dts = $this->formation('DTS Tourisme', 'DTS');
        $barista = $this->formation('Barista');
        $this->formation('BEP Réceptionniste', 'BEP');

        $l1 = $this->level($bts, 1, '1ère année');
        $l2 = $this->level($bts, 2, '2e année');

        return [
            'cap' => $cap, 'bts' => $bts, 'dts' => $dts, 'barista' => $barista, 'l1' => $l1, 'l2' => $l2,
            'cap1' => $this->klass('CAP 1 Restauration', $cap),
            'bts1' => $this->klass('BTS 1 Tourisme', $bts, $l1, capacity: 25),
            'bts2' => $this->klass('BTS 2 Tourisme', $bts, $l2),
            'btsFree' => $this->klass('BTS Passerelle', $bts),
            'dts1' => $this->klass('DTS 1 Tourisme', $dts),
            'bar1' => $this->klass('Barista – session 1', $barista),
        ];
    }

    private function index(array $query = [], ?User $user = null): TestResponse
    {
        return $this->actingAs($user ?? $this->admin())->get(route('admin.students.index', $query));
    }

    private function props(TestResponse $response): array
    {
        return $response->viewData('page')['props'];
    }

    /** @return list<string> */
    private function lastNames(TestResponse $response): array
    {
        return collect($this->props($response)['students']['data'])->pluck('last_name')->all();
    }

    // ───────────────────────────── L'arbre des promotions ─────────────────────────────

    public function test_the_landing_page_is_an_overview_of_promotions_not_a_list_of_students(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Ba', $w['cap1']);

        $this->index()->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Students/Index')
            ->where('mode', 'overview')
            ->where('students', null)
            ->where('scope', null)
            ->where('filters.status', 'actif')
            ->where('filters.year', (string) $this->year->id)
            ->where('defaults.status', 'actif')
            ->where('defaults.year', (string) $this->year->id)
            ->has('years', 2)
            ->where('tree.total', 2));
    }

    public function test_formations_are_grouped_by_diploma_from_the_lowest_level_to_the_highest(): void
    {
        $w = $this->world();
        $this->student('A', $w['dts1']);
        $this->student('B', $w['bar1']);
        $this->student('C', $w['bts1']);
        $this->student('D', $w['cap1']);

        $groups = $this->props($this->index())['tree']['groups'];

        $this->assertSame(['CAP', 'BTS', 'DTS', 'autres'], array_column($groups, 'key'));
        $this->assertSame(['CAP', 'BTS', 'DTS', 'Autres formations'], array_column($groups, 'label'));
        $this->assertSame('Brevet de Technicien Supérieur', $groups[1]['title']);
        $this->assertSame([1, 1, 1, 1], array_column($groups, 'count'));
        $this->assertSame(['Barista'], array_column($groups[3]['formations'], 'name'));
    }

    public function test_a_formation_shows_its_levels_then_its_classes_without_a_level(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', $w['bts1']);
        $this->student('Sow', $w['bts2']);
        $this->student('Ndao', $w['btsFree']);
        $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next);

        $bts = collect($this->props($this->index())['tree']['groups'])->firstWhere('key', 'BTS')['formations'][0];

        $this->assertSame('BTS Tourisme', $bts['name']);
        $this->assertSame(4, $bts['count']);
        $this->assertSame(['1ère année', '2e année'], array_column($bts['levels'], 'label'));
        $this->assertSame([2, 1], array_column($bts['levels'], 'count'));
        $this->assertSame(['BTS 1 Tourisme'], array_column($bts['levels'][0]['classes'], 'name'), 'la classe de l\'année suivante est écartée');
        $this->assertSame(25, $bts['levels'][0]['classes'][0]['capacity']);
        $this->assertSame('2026-2027', $bts['levels'][0]['classes'][0]['year']);
        $this->assertSame(['BTS Passerelle'], array_column($bts['classes'], 'name'), 'la classe sans niveau vient après les niveaux');
        $this->assertSame(1, $bts['classes'][0]['count']);
    }

    public function test_formations_without_class_or_student_are_left_out_of_the_tree(): void
    {
        $bts = $this->formation('BTS Tourisme', 'BTS');
        $this->formation('BEP Réceptionniste', 'BEP');
        $this->formation('Barista');
        $this->student('Fall', $this->klass('BTS 1 Tourisme', $bts));

        $names = collect($this->props($this->index())['tree']['groups'])->pluck('formations')->flatten(1)->pluck('name')->all();

        $this->assertSame(['BTS Tourisme'], $names);
    }

    public function test_a_class_without_students_still_appears_under_its_formation(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);

        $groups = collect($this->props($this->index())['tree']['groups']);
        $levels = $groups->firstWhere('key', 'BTS')['formations'][0]['levels'];
        $cap = $groups->firstWhere('key', 'CAP')['formations'][0];

        $this->assertSame([1, 0], array_column($levels, 'count'));
        $this->assertSame(0, $cap['count']);
        $this->assertSame(['CAP 1 Restauration'], array_column($cap['classes'], 'name'));
    }

    public function test_tree_counts_follow_the_status_and_year_filters(): void
    {
        $w = $this->world();
        $nextClass = $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next);
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', $w['bts1'], 'suspendu');
        $this->student('Sow', $w['bts1'], 'diplome');
        $this->student('Ba', $nextClass);

        $count = fn (array $query) => $this->props($this->index($query))['tree']['total'];

        $this->assertSame(1, $count([]), 'les actifs de l\'année en cours');
        $this->assertSame(3, $count(['status' => 'all']));
        $this->assertSame(1, $count(['status' => 'suspendu']));
        $this->assertSame(2, $count(['year' => 'all']));
        $this->assertSame(4, $count(['year' => 'all', 'status' => 'all']));
        $this->assertSame(1, $count(['year' => $this->next->id]));
    }

    public function test_students_without_class_or_formation_have_their_own_buckets(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', null, 'actif', ['formation_id' => $w['bts']->id]);
        $this->student('Sow', null);
        $this->student('Ba', null);

        $tree = $this->props($this->index())['tree'];
        $bts = collect($tree['groups'])->firstWhere('key', 'BTS')['formations'][0];

        $this->assertSame(4, $tree['total']);
        $this->assertSame(3, $tree['unassigned'], 'sans classe, toutes formations confondues');
        $this->assertSame(2, $tree['no_formation']);
        $this->assertSame(1, $bts['unassigned']);
        $this->assertSame(2, $bts['count']);
    }

    // ───────────────────────────── La liste d'élèves, par portée ─────────────────────────────

    public function test_a_class_scope_lists_its_students_sorted_by_name(): void
    {
        $w = $this->world();
        $this->student('Sow', $w['bts1']);
        $this->student('Ba', $w['bts1']);
        $this->student('Fall', $w['bts2']);

        $response = $this->index(['school_class_id' => $w['bts1']->id]);

        $response->assertInertia(fn (Assert $page) => $page
            ->where('mode', 'directory')
            ->has('students.data', 2)
            ->where('students.total', 2));
        $this->assertSame(['Ba', 'Sow'], $this->lastNames($response));
    }

    public function test_a_level_scope_lists_the_students_of_its_classes(): void
    {
        $w = $this->world();
        $bts1b = $this->klass('BTS 1 Tourisme B', $w['bts'], $w['l1']);
        $this->student('Sow', $w['bts1']);
        $this->student('Ba', $bts1b);
        $this->student('Fall', $w['bts2']);

        $this->assertSame(['Sow', 'Ba'], $this->lastNames($this->index(['formation_level_id' => $w['l1']->id])), 'BTS 1 Tourisme puis BTS 1 Tourisme B');
    }

    public function test_a_formation_scope_lists_its_students_by_class_then_name_with_unassigned_last(): void
    {
        $w = $this->world();
        $this->student('Zidane', null, 'actif', ['formation_id' => $w['bts']->id]);
        $this->student('Sow', $w['bts2']);
        $this->student('Ba', $w['bts2']);
        $this->student('Fall', $w['bts1']);
        $this->student('Ndao', $w['btsFree']);
        $this->student('Autre', $w['cap1']);

        $this->assertSame(['Fall', 'Ba', 'Sow', 'Ndao', 'Zidane'], $this->lastNames($this->index(['formation_id' => $w['bts']->id])));
    }

    public function test_the_unassigned_and_no_formation_scopes(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', null, 'actif', ['formation_id' => $w['bts']->id]);
        $this->student('Sow', null);

        $this->assertSame(['Diop', 'Sow'], $this->lastNames($this->index(['school_class_id' => 'none'])));
        $this->assertSame(['Diop'], $this->lastNames($this->index(['school_class_id' => 'none', 'formation_id' => $w['bts']->id])));
        $this->assertSame(['Sow'], $this->lastNames($this->index(['formation_id' => 'none'])));
    }

    public function test_the_whole_school_is_listed_only_when_asked_for(): void
    {
        $w = $this->world();
        $this->student('Sow', $w['bts1']);
        $this->student('Ba', $w['cap1']);

        $this->index()->assertInertia(fn (Assert $page) => $page->where('mode', 'overview')->where('students', null));

        $response = $this->index(['list' => 1]);

        $response->assertInertia(fn (Assert $page) => $page->where('mode', 'directory')->where('scope.kind', 'all'));
        $this->assertSame(['Sow', 'Ba'], $this->lastNames($response), 'tri par nom de classe : BTS 1 Tourisme avant CAP 1 Restauration');
    }

    public function test_class_counts_serve_the_group_headers(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', $w['bts1']);
        $this->student('Zidane', null);

        $this->index(['list' => 1])->assertInertia(fn (Assert $page) => $page
            ->where("classCounts.{$w['bts1']->id}", 2)
            ->where('classCounts.none', 1));
    }

    // ───────────────────────────── Statut et année ─────────────────────────────

    public function test_active_students_are_listed_by_default_and_every_status_on_request(): void
    {
        $w = $this->world();
        $this->student('Actif', $w['bts1']);
        $this->student('Suspendu', $w['bts1'], 'suspendu');
        $this->student('Diplome', $w['bts1'], 'diplome');
        $this->student('Exclu', $w['bts1'], 'exclu');

        $scope = ['school_class_id' => $w['bts1']->id];

        $this->assertSame(['Actif'], $this->lastNames($this->index($scope)));
        $this->assertSame(['Actif', 'Diplome', 'Exclu', 'Suspendu'], $this->lastNames($this->index($scope + ['status' => 'all'])));
        $this->assertSame(['Exclu'], $this->lastNames($this->index($scope + ['status' => 'exclu'])));
    }

    public function test_status_counts_ignore_the_selected_status_but_follow_the_scope_and_search(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Faye', $w['bts1'], 'suspendu');
        $this->student('Sow', $w['bts1'], 'diplome');
        $this->student('Ba', $w['cap1']);

        $counts = fn (array $query) => $this->props($this->index($query))['statusCounts'];

        $this->assertEquals(
            ['all' => 3, 'actif' => 1, 'suspendu' => 1, 'diplome' => 1, 'transfere' => 0, 'abandon' => 0, 'exclu' => 0],
            $counts(['school_class_id' => $w['bts1']->id, 'status' => 'diplome']),
        );
        $this->assertSame(2, $counts(['school_class_id' => $w['bts1']->id, 'search' => 'f'])['all'], 'Fall et Faye');
        $this->assertSame(4, $counts([])['all'], 'aperçu : toute l\'école');
    }

    public function test_the_current_year_is_the_default_and_keeps_students_without_a_year(): void
    {
        $w = $this->world();
        $nextClass = $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next);
        $this->student('Courant', $w['bts1']);
        $this->student('SansAnnee', null, 'actif', ['academic_year_id' => null]);
        $this->student('Futur', $nextClass);

        $this->assertSame(['Courant', 'SansAnnee'], $this->lastNames($this->index(['list' => 1])));
    }

    public function test_another_year_or_all_years_can_be_chosen(): void
    {
        $w = $this->world();
        $nextClass = $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next);
        $this->student('Courant', $w['bts1']);
        $this->student('SansAnnee', null, 'actif', ['academic_year_id' => null]);
        $this->student('Futur', $nextClass);

        $this->assertSame(['Futur'], $this->lastNames($this->index(['list' => 1, 'year' => $this->next->id])), 'les dossiers sans année ne suivent pas une autre année');
        $this->assertSame(['Courant', 'Futur', 'SansAnnee'], $this->lastNames($this->index(['list' => 1, 'year' => 'all'])));
    }

    public function test_the_year_of_a_student_is_the_year_of_his_class(): void
    {
        $w = $this->world();
        $nextClass = $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next);

        // Saisies incohérentes, que le formulaire permet (la classe et l'année se choisissent séparément) : la classe fait foi.
        $this->student('ClasseFuture', $nextClass, 'actif', ['academic_year_id' => null]);
        $this->student('ClasseFutureAnneeCourante', $nextClass, 'actif', ['academic_year_id' => $this->year->id]);
        $this->student('ClasseCouranteAnneeFuture', $w['bts1'], 'actif', ['academic_year_id' => $this->next->id]);
        $this->student('Coherent', $w['bts1']);

        $this->assertSame(['ClasseCouranteAnneeFuture', 'Coherent'], $this->lastNames($this->index(['list' => 1])), 'année en cours : les deux élèves de la classe de cette année');
        $this->assertSame(['ClasseFuture', 'ClasseFutureAnneeCourante'], $this->lastNames($this->index(['list' => 1, 'year' => $this->next->id])), 'année suivante : ceux de la classe de l\'année suivante');

        $props = $this->props($this->index());
        $tile = collect($props['tree']['groups'])->firstWhere('key', 'BTS')['formations'][0]['levels'][0]['classes'][0];

        $this->assertSame($w['bts1']->id, $tile['id']);
        $this->assertSame(2, $tile['count'], 'la tuile de la classe compte ses deux élèves');
        $this->assertSame(['2027-2028' => 2, '2026-2027' => 2], collect($props['years'])->pluck('count', 'label')->all(), 'les effectifs par année suivent la même règle');
    }

    public function test_without_a_current_year_every_year_is_shown(): void
    {
        $this->year->update(['is_current' => false]);
        $w = $this->world();
        $this->student('Fall', $w['bts1']);

        $this->index()->assertInertia(fn (Assert $page) => $page
            ->where('filters.year', 'all')
            ->where('defaults.year', 'all')
            ->where('tree.total', 1));
    }

    public function test_an_empty_overview_points_to_students_of_other_years(): void
    {
        $w = $this->world();
        $this->student('Futur', $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next));

        $this->index()->assertInertia(fn (Assert $page) => $page
            ->where('tree.total', 0)
            ->where('elsewhere.count', 1));

        $this->index(['year' => $this->next->id])->assertInertia(fn (Assert $page) => $page
            ->where('tree.total', 1)
            ->where('elsewhere', null));
    }

    public function test_years_come_with_their_student_counts(): void
    {
        $w = $this->world();
        $this->student('A', $w['bts1']);
        $this->student('B', $w['bts1']);
        $this->student('C', null, 'actif', ['academic_year_id' => null]);
        $this->student('D', $w['bts1'], 'diplome');
        $this->student('E', $this->klass('BTS 1 Tourisme', $w['bts'], $w['l1'], $this->next));

        $props = $this->props($this->index());

        $this->assertSame(['2027-2028', '2026-2027'], array_column($props['years'], 'label'), 'la plus récente d\'abord');
        $this->assertSame([1, 3], array_column($props['years'], 'count'), 'actifs : le dossier sans année compte pour l\'année en cours, le diplômé non');
        $this->assertSame([false, true], array_column($props['years'], 'is_current'));
        $this->assertSame(4, $props['allYearsCount']);
        $this->assertSame([1, 4], array_column($this->props($this->index(['status' => 'all']))['years'], 'count'));
    }

    public function test_invalid_filters_fall_back_to_the_defaults(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);

        $this->index(['year' => 'abc', 'status' => 'hacked', 'sort' => 'drop table', 'formation_id' => 'x', 'school_class_id' => '9999999'])
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.year', (string) $this->year->id)
                ->where('filters.status', 'actif')
                ->where('filters.sort', 'name')
                ->where('filters.formation_id', '')
                ->where('students.total', 0));
    }

    // ───────────────────────────── Recherche et dossiers ─────────────────────────────

    public function test_search_matches_words_in_any_order_matricule_and_phone(): void
    {
        $w = $this->world();
        $this->student('Diop', $w['bts1'], 'actif', ['first_name' => 'Awa', 'matricule' => 'EEHT-0042', 'phone' => '77 187 79 18']);
        $this->student('Diop', $w['bts1'], 'actif', ['first_name' => 'Moussa', 'phone' => '771112233']);
        $this->student('Ndiaye', $w['cap1'], 'actif', ['first_name' => 'Awa', 'guardian_phone' => '76 555 44 33']);

        $search = fn (string $term) => collect($this->props($this->index(['search' => $term]))['students']['data'])
            ->map(fn ($row) => $row['first_name'].' '.$row['last_name'])->sort()->values()->all();

        $this->assertSame(['Awa Diop'], $search('diop awa'));
        $this->assertSame(['Awa Diop', 'Awa Ndiaye'], $search('awa'));
        $this->assertSame(['Awa Diop'], $search('0042'));
        $this->assertSame(['Awa Diop'], $search('187 79'), 'le numéro tel qu\'il a été saisi');
        $this->assertSame(['Awa Diop'], $search('771877918'), 'le numéro collé, alors qu\'il est saisi avec des espaces');
        $this->assertSame(['Moussa Diop'], $search('+221 77 111 22 33'), 'avec l\'indicatif, alors qu\'il n\'est pas saisi');
        $this->assertSame(['Awa Ndiaye'], $search('76 555'), 'le téléphone du tuteur');
        $this->assertSame([], $search('introuvable'));
    }

    public function test_an_empty_result_tells_how_many_students_match_in_other_statuses(): void
    {
        $w = $this->world();
        $this->student('Diop', $w['bts1'], 'diplome');
        $this->student('Diallo', $w['bts1'], 'transfere');

        $this->index(['search' => 'di'])->assertInertia(fn (Assert $page) => $page
            ->where('students.total', 0)
            ->where('elsewhere.count', 2));

        $this->index(['search' => 'di', 'status' => 'all'])->assertInertia(fn (Assert $page) => $page
            ->where('students.total', 2)
            ->where('elsewhere', null));

        $this->index(['search' => 'personne'])->assertInertia(fn (Assert $page) => $page
            ->where('students.total', 0)
            ->where('elsewhere', null));
    }

    public function test_the_incomplete_filter_and_the_dossier_summary(): void
    {
        $w = $this->world();
        $complete = ['photo' => 'students/photos/a.jpg', 'birth_date' => '2005-01-01', 'phone' => '77 000 00 01', 'address' => 'Thiès', 'guardian_name' => 'Parent'];
        $this->student('Complet', $w['bts1'], 'actif', $complete);
        $this->student('SansPhoto', $w['bts1'], 'actif', array_merge($complete, ['photo' => null]));
        $this->student('Vide', $w['bts1']);

        $props = $this->props($this->index());
        $bts1 = collect($props['tree']['groups'])->firstWhere('key', 'BTS')['formations'][0]['levels'][0]['classes'][0];
        $this->assertSame(3, $bts1['count']);
        $this->assertSame(2, $bts1['incomplete']);
        $this->assertSame(2, $props['stats']['incomplete']);
        $this->assertSame(2, $props['incompleteCount']);

        $response = $this->index(['school_class_id' => $w['bts1']->id, 'incomplete' => 1]);
        $this->assertSame(['SansPhoto', 'Vide'], $this->lastNames($response));
        $this->assertSame(2, $this->props($response)['incompleteCount'], 'le nombre ne dépend pas du filtre qu\'il propose d\'activer');
        $this->assertSame(1, $this->props($this->index(['school_class_id' => $w['bts1']->id, 'search' => 'vide']))['incompleteCount'], 'il suit la recherche');

        $rows = collect($this->props($response)['students']['data'])->keyBy('last_name');
        $this->assertSame(4, $rows['SansPhoto']['dossier']['done']);
        $this->assertSame(5, $rows['SansPhoto']['dossier']['total']);
        $this->assertSame(['Photo'], $rows['SansPhoto']['dossier']['missing']);
        $this->assertSame(0, $rows['Vide']['dossier']['done']);
    }

    public function test_rows_carry_contact_links_and_no_health_data(): void
    {
        $w = $this->world();
        $this->student('Diop', $w['bts1'], 'actif', [
            'first_name' => 'Awa', 'phone' => '77 187 79 18', 'email' => 'awa@example.test', 'photo' => 'students/photos/awa.jpg',
            'allergies' => 'arachides', 'blood_group' => 'O+', 'health_notes' => 'asthme', 'chronic_conditions' => 'x', 'current_medication' => 'y',
            'doctor_name' => 'Dr Sy', 'is_repeating' => true, 'guardian_name' => 'Mamadou Diop', 'guardian_phone' => '76 111 22 33',
        ]);

        $this->index(['school_class_id' => $w['bts1']->id])->assertInertia(fn (Assert $page) => $page
            ->where('students.data.0.first_name', 'Awa')
            ->where('students.data.0.status', 'actif')
            ->where('students.data.0.is_repeating', true)
            ->where('students.data.0.photo_url', '/storage/students/photos/awa.jpg')
            ->where('students.data.0.school_class.name', 'BTS 1 Tourisme')
            ->where('students.data.0.formation.name', 'BTS Tourisme')
            ->where('students.data.0.level', '1ère année')
            ->where('students.data.0.year', '2026-2027')
            ->where('students.data.0.phone_display', '+221 77 187 79 18')
            ->where('students.data.0.contact.owner', 'student')
            ->where('students.data.0.contact.display', '+221 77 187 79 18')
            ->where('students.data.0.contact.tel', '+221771877918')
            ->where('students.data.0.contact.whatsapp', '221771877918')
            ->where('students.data.0.contact.email', 'awa@example.test')
            ->where('students.data.0.guardian.name', 'Mamadou Diop')
            ->where('students.data.0.guardian.phone', '+221 76 111 22 33')
            ->missing('students.data.0.allergies')
            ->missing('students.data.0.blood_group')
            ->missing('students.data.0.health_notes')
            ->missing('students.data.0.chronic_conditions')
            ->missing('students.data.0.current_medication')
            ->missing('students.data.0.doctor_name')
            ->missing('students.data.0.qr_token'));
    }

    public function test_the_guardian_is_called_when_the_student_has_no_phone(): void
    {
        $w = $this->world();
        $this->student('Diop', $w['bts1'], 'actif', ['guardian_phone' => '76 111 22 33', 'guardian_email' => 'parent@example.test']);
        $this->student('Sow', $w['bts1']);

        $rows = collect($this->props($this->index(['school_class_id' => $w['bts1']->id]))['students']['data'])->keyBy('last_name');

        $this->assertSame('guardian', $rows['Diop']['contact']['owner']);
        $this->assertSame('+221761112233', $rows['Diop']['contact']['tel']);
        $this->assertSame('parent@example.test', $rows['Diop']['contact']['email']);
        $this->assertNull($rows['Sow']['contact']['owner']);
        $this->assertNull($rows['Sow']['contact']['tel']);
        $this->assertNull($rows['Sow']['contact']['whatsapp']);
        $this->assertNull($rows['Sow']['contact']['email']);
    }

    public function test_the_balance_is_only_sent_to_users_allowed_to_see_accounting(): void
    {
        $this->seed(AccountingSeeder::class);
        $w = $this->world();
        $debtor = $this->student('Debiteur', $w['bts1']);
        $late = $this->student('Retard', $w['bts1']);
        $this->student('Quitte', $w['bts1']);
        $invoice = Invoice::create(['student_id' => $debtor->id, 'type' => 'scolarite', 'label' => 'Scolarité', 'amount' => 100000, 'discount' => 10000, 'due_date' => now()->addDays(10)]);
        $invoice->payments()->create(['amount' => 40000, 'method' => 'especes', 'paid_at' => now()]);
        Invoice::create(['student_id' => $late->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 15000, 'discount' => 0, 'due_date' => now()->subDays(12)]);

        $scope = ['school_class_id' => $w['bts1']->id];

        $this->index($scope)->assertInertia(fn (Assert $page) => $page
            ->where('canSeeFinance', true)
            ->where('students.data.0.last_name', 'Debiteur')
            ->where('students.data.0.balance', fn ($balance) => (float) $balance === 50000.0)
            ->where('students.data.0.late', false)
            ->where('students.data.1.last_name', 'Quitte')
            ->where('students.data.1.balance', fn ($balance) => (float) $balance === 0.0)
            ->where('students.data.1.late', false)
            ->where('students.data.2.last_name', 'Retard')
            ->where('students.data.2.balance', fn ($balance) => (float) $balance === 15000.0)
            ->where('students.data.2.late', true));

        $this->index($scope, $this->staff('responsable-pedagogique'))->assertInertia(fn (Assert $page) => $page
            ->where('canSeeFinance', false)
            ->has('students.data', 3)
            ->missing('students.data.0.balance')
            ->missing('students.data.0.late'));
    }

    // ───────────────────────────── Pagination, tri, portée décrite ─────────────────────────────

    public function test_results_are_paginated_by_twenty_four_and_keep_their_query(): void
    {
        $w = $this->world();
        foreach (range(1, 30) as $i) {
            $this->student(sprintf('Nom%02d', $i), $w['bts1']);
        }

        $response = $this->index(['school_class_id' => $w['bts1']->id]);

        $response->assertInertia(fn (Assert $page) => $page
            ->has('students.data', 24)
            ->where('students.total', 30)
            ->where('students.last_page', 2)
            ->where('students.next_page_url', fn ($url) => str_contains((string) $url, 'school_class_id='.$w['bts1']->id)));
        $this->assertSame(30, array_sum(array_map('intval', (array) $this->props($response)['classCounts'])), 'les effectifs portent sur toutes les pages');
    }

    public function test_the_number_of_queries_does_not_grow_with_the_number_of_students(): void
    {
        $this->seed(AccountingSeeder::class);
        $w = $this->world();
        $first = $this->student('Premier', $w['bts1'], 'actif', ['phone' => '77 000 00 01']);
        Invoice::create(['student_id' => $first->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 15000, 'discount' => 0, 'due_date' => now()->subDays(3)]);

        $scope = ['school_class_id' => $w['bts1']->id];
        $this->index($scope)->assertOk(); // première requête : session, rôles et permissions se chargent une fois

        // Les lectures des réglages du site (« settings »), communes à toutes les pages, ne comptent pas : seules celles de la
        // page Élèves. Le nom de la table est entre guillemets sur SQLite et entre apostrophes inversées sur MySQL.
        $count = function () use ($scope): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->index($scope)->assertOk();

            return count(array_filter(DB::getQueryLog(), fn (array $query) => ! preg_match('/from [`"]settings[`"]/', $query['query'])));
        };

        $few = $count();

        foreach (range(1, 20) as $i) {
            $student = $this->student("Nom{$i}", $w['bts1'], 'actif', ['phone' => "77 000 10 {$i}", 'guardian_phone' => "76 000 20 {$i}"]);
            Invoice::create(['student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 15000, 'discount' => 0, 'due_date' => now()->addDays($i)]);
        }

        $this->assertSame($few, $count(), 'vingt élèves de plus, avec leurs factures, ne changent pas le nombre de requêtes');
        $this->assertLessThan(30, $few, 'une page de promotion se prépare en moins de trente requêtes');
    }

    public function test_the_list_can_be_sorted_by_recent_or_matricule(): void
    {
        $w = $this->world();
        $this->student('Alpha', $w['bts1'], 'actif', ['matricule' => 'Z-1']);
        $this->student('Beta', $w['cap1'], 'actif', ['matricule' => 'A-1']);
        $this->student('Gamma', $w['bts1'], 'actif', ['matricule' => 'M-1']);

        $this->assertSame(['Gamma', 'Beta', 'Alpha'], $this->lastNames($this->index(['list' => 1, 'sort' => 'recent'])));
        $this->assertSame(['Beta', 'Gamma', 'Alpha'], $this->lastNames($this->index(['list' => 1, 'sort' => 'matricule'])));
        $this->assertSame(['Alpha', 'Gamma', 'Beta'], $this->lastNames($this->index(['list' => 1])));
    }

    public function test_the_scope_describes_where_the_user_is(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', $w['bts1']);
        $this->student('Sow', $w['bts1'], 'suspendu');

        $this->index(['school_class_id' => $w['bts1']->id])->assertInertia(fn (Assert $page) => $page
            ->where('scope.kind', 'class')
            ->where('scope.title', 'BTS 1 Tourisme')
            ->where('scope.diploma.key', 'BTS')
            ->where('scope.formation.name', 'BTS Tourisme')
            ->where('scope.level.label', '1ère année')
            ->where('scope.class.id', $w['bts1']->id)
            ->where('scope.class.capacity', 25)
            ->where('scope.class.active', 2));

        $this->index(['formation_id' => $w['bts']->id])->assertInertia(fn (Assert $page) => $page
            ->where('scope.kind', 'formation')
            ->where('scope.title', 'BTS Tourisme')
            ->where('scope.class', null));

        $this->index(['formation_level_id' => $w['l2']->id])->assertInertia(fn (Assert $page) => $page
            ->where('scope.kind', 'level')
            ->where('scope.title', '2e année')
            ->where('scope.formation.name', 'BTS Tourisme'));

        $this->index(['school_class_id' => 'none'])->assertInertia(fn (Assert $page) => $page
            ->where('scope.kind', 'unassigned')
            ->where('scope.title', 'À affecter'));

        $this->index(['search' => 'fall'])->assertInertia(fn (Assert $page) => $page
            ->where('scope.kind', 'search')
            ->where('scope.title', 'Recherche : « fall »'));
    }

    public function test_the_highlighted_student_is_echoed_back(): void
    {
        $w = $this->world();
        $student = $this->student('Fall', $w['bts1']);

        $this->index(['school_class_id' => $w['bts1']->id, 'highlight' => $student->id])
            ->assertInertia(fn (Assert $page) => $page->where('filters.highlight', $student->id));
    }

    // ───────────────────────────── Exports, enregistrement, création ─────────────────────────────

    public function test_exports_follow_the_scope_of_the_page(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $this->student('Diop', $w['bts1'], 'diplome');
        $this->student('Sow', $w['cap1']);

        $csv = fn (array $query) => $this->actingAs($this->admin())->get(route('admin.students.export.csv', $query))->streamedContent();

        $everything = $csv([]);
        $this->assertStringContainsString('Fall', $everything);
        $this->assertStringContainsString('Diop', $everything);
        $this->assertStringContainsString('Sow', $everything, 'sans filtre : toute l\'école, comme avant');

        $scoped = $csv(['school_class_id' => $w['bts1']->id, 'status' => 'actif', 'year' => $this->year->id]);
        $this->assertStringContainsString('Fall', $scoped);
        $this->assertStringNotContainsString('Diop', $scoped, 'diplômé : hors du statut demandé');
        $this->assertStringNotContainsString('Sow', $scoped, 'autre classe');
    }

    public function test_an_export_says_which_view_it_reproduces(): void
    {
        $w = $this->world();
        $this->student('Fall', $w['bts1']);
        $user = $this->admin();

        $describe = fn (array $query) => StudentDirectory::fromRequest(Request::create('/', 'GET', $query), withDefaults: false)->describe();

        $this->assertSame('Toute l\'école · toutes les années · tous les statuts', $describe([]));
        $this->assertSame(
            'BTS 1 Tourisme · 2026-2027 · élèves actifs',
            $describe(['school_class_id' => $w['bts1']->id, 'year' => $this->year->id, 'status' => 'actif']),
        );
        $this->assertSame('BTS Tourisme · toutes les années · diplômés', $describe(['formation_id' => $w['bts']->id, 'status' => 'diplome']));
        $this->assertSame('À affecter · 2027-2028 · tous les statuts', $describe(['school_class_id' => 'none', 'year' => $this->next->id]));
        $this->assertSame('Recherche : « fall » · toutes les années · tous les statuts', $describe(['search' => 'fall']));

        $response = $this->actingAs($user)->get(route('admin.students.export.csv', ['school_class_id' => $w['bts1']->id, 'status' => 'actif', 'year' => $this->year->id]));
        $this->assertStringContainsString('eleves-bts-1-tourisme-'.now()->format('Y-m-d').'.csv', (string) $response->headers->get('content-disposition'));

        $everything = $this->actingAs($user)->get(route('admin.students.export.csv'));
        $this->assertStringContainsString('eleves-'.now()->format('Y-m-d').'.csv', (string) $everything->headers->get('content-disposition'), 'sans filtre, le nom ne change pas');

        $pdf = $this->actingAs($user)->get(route('admin.students.export.pdf', ['school_class_id' => $w['bts1']->id]));
        $pdf->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('content-type'));
    }

    private function redirectQuery(TestResponse $response): array
    {
        $response->assertRedirect();
        parse_str((string) parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

        return $query;
    }

    public function test_saving_a_student_returns_to_his_class_with_the_dossier_highlighted(): void
    {
        $w = $this->world();

        $created = $this->actingAs($this->admin())->post(route('admin.students.store'), [
            'matricule' => 'NEW-1', 'first_name' => 'Nouvel', 'last_name' => 'Elève', 'status' => 'actif',
            'formation_id' => $w['bts']->id, 'school_class_id' => $w['bts1']->id, 'academic_year_id' => $this->year->id,
        ]);
        $student = Student::where('matricule', 'NEW-1')->firstOrFail();

        $this->assertEquals(
            ['school_class_id' => (string) $w['bts1']->id, 'highlight' => (string) $student->id],
            $this->redirectQuery($created),
            'l\'année en cours et le statut actif sont les valeurs par défaut : ils ne sont pas répétés',
        );

        $updated = $this->actingAs($this->admin())->put(route('admin.students.update', $student), [
            'matricule' => 'NEW-1', 'first_name' => 'Nouvel', 'last_name' => 'Elève', 'status' => 'suspendu',
            'formation_id' => $w['bts']->id, 'school_class_id' => $w['bts1']->id, 'academic_year_id' => $this->next->id,
        ]);

        $this->assertEquals(
            ['school_class_id' => (string) $w['bts1']->id, 'highlight' => (string) $student->id, 'year' => (string) $this->next->id, 'status' => 'suspendu'],
            $this->redirectQuery($updated),
            'une autre année et un autre statut sont rappelés pour que la fiche reste visible',
        );
    }

    public function test_a_student_without_class_returns_to_his_formation_and_one_without_formation_to_the_whole_list(): void
    {
        $w = $this->world();

        $withFormation = $this->actingAs($this->admin())->post(route('admin.students.store'), [
            'matricule' => 'NEW-2', 'first_name' => 'A', 'last_name' => 'B', 'status' => 'actif', 'formation_id' => $w['bts']->id,
        ]);
        $this->assertEquals(
            ['formation_id' => (string) $w['bts']->id, 'highlight' => (string) Student::where('matricule', 'NEW-2')->value('id')],
            $this->redirectQuery($withFormation),
        );

        $bare = $this->actingAs($this->admin())->post(route('admin.students.store'), [
            'matricule' => 'NEW-3', 'first_name' => 'C', 'last_name' => 'D', 'status' => 'actif',
        ]);
        $this->assertEquals(
            ['list' => '1', 'highlight' => (string) Student::where('matricule', 'NEW-3')->value('id')],
            $this->redirectQuery($bare),
        );
    }

    public function test_the_new_student_form_can_be_prefilled_from_a_class(): void
    {
        $w = $this->world();

        $this->actingAs($this->admin())
            ->get(route('admin.students.create', ['formation_id' => $w['bts']->id, 'school_class_id' => $w['bts1']->id, 'academic_year_id' => $this->year->id, 'status' => 'exclu', 'evil' => 'x']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Students/Form')
                ->where('defaults.formation_id', $w['bts']->id)
                ->where('defaults.school_class_id', $w['bts1']->id)
                ->where('defaults.academic_year_id', $this->year->id)
                ->missing('defaults.status')
                ->missing('defaults.evil'));

        $this->actingAs($this->admin())
            ->get(route('admin.students.create', ['school_class_id' => 999999]))
            ->assertInertia(fn (Assert $page) => $page->where('defaults', []));
    }

    public function test_every_status_of_the_list_can_be_stored_in_the_database(): void
    {
        // Sur MySQL la colonne est un ENUM : un statut qui n'y figure pas (« exclu » l'a longtemps été) fait échouer l'enregistrement.
        foreach (array_keys(Student::STATUSES) as $status) {
            $student = $this->student('Statut '.$status, null, $status);

            $this->assertSame($status, $student->fresh()->status);
        }
    }

    public function test_the_page_still_requires_the_students_permission(): void
    {
        $this->world();

        $this->index([], $this->staff('caissier'))->assertForbidden();
    }
}

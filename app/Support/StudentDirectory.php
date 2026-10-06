<?php

namespace App\Support;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\Invoice;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Ce que prépare la page « Élèves » (StudentController@index) et ce que ses exports reprennent.
 *
 * La page n'est plus une longue liste : elle s'ouvre sur un APERÇU des promotions, rangées par niveau de formation
 * (le diplôme : CAP, BEP, BTS…), formation, niveau d'année puis classe, avec les effectifs de chacune. Les élèves ne
 * s'affichent qu'une fois une portée choisie (une classe, un niveau, une formation, les élèves à affecter…) ou une
 * recherche lancée : c'est le mode « liste ».
 *
 * Les filtres viennent de l'adresse, donc partageables et compatibles avec le bouton retour :
 *  - year : une année académique ou « all » (par défaut l'année en cours, dossiers sans année compris) ;
 *  - formation_id, formation_level_id, school_class_id : la portée (« none » = sans formation / sans classe) ;
 *  - status : un statut ou « all » (par défaut « actif ») ;
 *  - search, incomplete (dossiers à compléter), sort (name, recent, matricule), list (toute l'école), highlight.
 *
 * Une valeur invalide revient à sa valeur par défaut au lieu de faire échouer la page. Pour les exports, appelée sans
 * valeurs par défaut, l'absence de filtre veut dire « tous » : un lien d'export ancien exporte toujours toute l'école.
 */
final class StudentDirectory
{
    public const PER_PAGE = 24;

    public const SORTS = ['name', 'recent', 'matricule'];

    /**
     * L'année d'un élève : celle de sa classe, et à défaut la sienne. Le formulaire laisse choisir la classe et l'année
     * séparément ; si elles se contredisent, c'est la classe qui fait foi, sans quoi l'élève disparaîtrait de sa
     * promotion (l'aperçu et la liste de la classe ne le trouveraient plus sous la même année).
     */
    private const EFFECTIVE_YEAR = 'coalesce((select school_classes.academic_year_id from school_classes where school_classes.id = students.school_class_id), students.academic_year_id)';

    /** « 12 élèves actifs », « 3 diplômés » : le statut dans une phrase (descriptions des exports). */
    private const STATUS_PHRASES = [
        'actif' => 'élèves actifs',
        'suspendu' => 'élèves suspendus',
        'diplome' => 'diplômés',
        'transfere' => 'transférés',
        'abandon' => 'abandons',
        'exclu' => 'élèves exclus',
    ];

    /** @param  array<string, mixed>  $filters */
    private function __construct(private readonly array $filters, private readonly ?int $currentYear) {}

    public static function fromRequest(Request $request, bool $withDefaults = true): self
    {
        $current = AcademicYear::query()->where('is_current', true)->orderByDesc('start_date')->value('id');
        $current = $current === null ? null : (int) $current;

        $fallbackYear = $withDefaults && $current !== null ? (string) $current : 'all';
        $year = self::scalar($request, 'year');

        if ($year !== 'all') {
            $year = ctype_digit($year) && AcademicYear::query()->whereKey((int) $year)->exists() ? (string) (int) $year : $fallbackYear;
        }

        $status = self::scalar($request, 'status');

        if ($status !== 'all' && ! array_key_exists($status, Student::STATUSES)) {
            $status = $withDefaults ? 'actif' : 'all';
        }

        $sort = self::scalar($request, 'sort');
        $highlight = self::scalar($request, 'highlight');

        return new self([
            'year' => $year,
            'formation_id' => self::reference(self::scalar($request, 'formation_id'), allowNone: true),
            'formation_level_id' => self::reference(self::scalar($request, 'formation_level_id'), allowNone: false),
            'school_class_id' => self::reference(self::scalar($request, 'school_class_id'), allowNone: true),
            'status' => $status,
            'search' => mb_substr(self::scalar($request, 'search'), 0, 60),
            'incomplete' => filter_var(self::scalar($request, 'incomplete'), FILTER_VALIDATE_BOOLEAN),
            'sort' => in_array($sort, self::SORTS, true) ? $sort : 'name',
            'list' => filter_var(self::scalar($request, 'list'), FILTER_VALIDATE_BOOLEAN),
            'highlight' => ctype_digit($highlight) && (int) $highlight > 0 ? (int) $highlight : null,
        ], $current);
    }

    /** Paramètres d'adresse qui ramènent à la fiche d'un élève qu'on vient d'enregistrer, pour qu'elle reste visible. */
    public static function locate(Student $student): array
    {
        $params = match (true) {
            $student->school_class_id !== null => ['school_class_id' => $student->school_class_id],
            $student->formation_id !== null => ['formation_id' => $student->formation_id],
            default => ['list' => 1],
        };

        $params['highlight'] = $student->id;

        $current = AcademicYear::query()->where('is_current', true)->orderByDesc('start_date')->value('id');

        // L'année en cours et le statut « actif » sont les valeurs par défaut : on ne les répète que s'ils diffèrent.
        if ($student->academic_year_id !== null && (int) $student->academic_year_id !== (int) $current) {
            $params['year'] = $student->academic_year_id;
        }

        if ($student->status !== 'actif') {
            $params['status'] = $student->status;
        }

        return $params;
    }

    /** « 12 » ou « none » (si permis) ; tout le reste (texte, zéro, tableau) est ignoré. */
    private static function reference(string $value, bool $allowNone): string
    {
        if ($allowNone && $value === 'none') {
            return 'none';
        }

        return ctype_digit($value) && (int) $value > 0 ? (string) (int) $value : '';
    }

    /** La valeur d'un paramètre d'adresse, en texte : un tableau (« ?year[]=1 ») devient vide au lieu de lever une erreur. */
    private static function scalar(Request $request, string $key): string
    {
        $value = $request->query($key);

        return is_scalar($value) ? trim((string) $value) : '';
    }

    // ───────────────────────────── Filtres ─────────────────────────────

    /** « overview » : l'aperçu des promotions ; « directory » : la liste des élèves d'une portée ou d'une recherche. */
    public function mode(): string
    {
        $f = $this->filters;

        return $f['list'] || $f['incomplete'] || $f['search'] !== ''
            || $f['formation_id'] !== '' || $f['formation_level_id'] !== '' || $f['school_class_id'] !== ''
            ? 'directory'
            : 'overview';
    }

    /** Les filtres effectivement appliqués, tels que la page les renvoie dans l'adresse. */
    public function filters(): array
    {
        return $this->filters;
    }

    private function with(array $overrides): self
    {
        return new self(array_merge($this->filters, $overrides), $this->currentYear);
    }

    /**
     * Les élèves qui répondent aux filtres. `$without` écarte des familles de filtres pour compter ce qui reste :
     * « status » (les compteurs de statut), « scope » (la portée), « search », « incomplete ». L'année s'applique toujours.
     *
     * @param  list<string>  $without
     * @return Builder<Student>
     */
    public function query(array $without = []): Builder
    {
        $query = Student::query();
        $f = $this->filters;

        if ($f['year'] !== 'all') {
            $year = (int) $f['year'];
            $effective = self::EFFECTIVE_YEAR;
            // Un dossier sans année n'est rattaché à aucune : on le montre avec l'année en cours, pas avec les autres.
            $query->where(function (Builder $where) use ($year, $effective) {
                $where->whereRaw("{$effective} = ?", [$year]);

                if ($year === $this->currentYear) {
                    $where->orWhereRaw("{$effective} is null");
                }
            });
        }

        if (! in_array('status', $without, true) && $f['status'] !== 'all') {
            $query->where('students.status', $f['status']);
        }

        if (! in_array('scope', $without, true)) {
            $this->applyScope($query);
        }

        if (! in_array('search', $without, true) && $f['search'] !== '') {
            $this->applySearch($query, $f['search']);
        }

        if (! in_array('incomplete', $without, true) && $f['incomplete']) {
            $query->whereRaw(StudentDossier::incompleteSql());
        }

        return $query;
    }

    private function applyScope(Builder $query): void
    {
        $f = $this->filters;

        if ($f['school_class_id'] === 'none') {
            $query->whereNull('students.school_class_id');
        } elseif ($f['school_class_id'] !== '') {
            $query->where('students.school_class_id', (int) $f['school_class_id']);
        }

        if ($f['formation_id'] === 'none') {
            $query->whereNull('students.formation_id');
        } elseif ($f['formation_id'] !== '') {
            $query->where('students.formation_id', (int) $f['formation_id']);
        }

        if ($f['formation_level_id'] !== '') {
            $query->whereIn('students.school_class_id', SchoolClass::query()->select('id')->where('formation_level_id', (int) $f['formation_level_id']));
        }
    }

    /**
     * Chaque mot tapé se retrouve dans le nom, le matricule, un numéro ou une adresse e-mail (« diop awa » = « awa
     * diop »). Un numéro tapé en entier est aussi comparé aux numéros enregistrés sans leurs espaces, points et tirets,
     * avec et sans l'indicatif : « 771877918 » retrouve « 77 187 79 18 », « +221 77 187 79 18 » aussi.
     */
    private function applySearch(Builder $query, string $search): void
    {
        $terms = TermSearch::terms($search);

        if ($terms === []) {
            return;
        }

        $columns = ['students.first_name', 'students.last_name', 'students.matricule', 'students.phone', 'students.guardian_phone', 'students.email', 'students.guardian_email', 'students.professional_email'];
        $grammar = $query->getQuery()->getGrammar();

        $query->where(function (Builder $where) use ($terms, $columns, $search, $grammar) {
            $where->where(fn (Builder $every) => TermSearch::whereEveryTerm($every, $terms, $columns));

            foreach ($this->phoneCandidates($search) as $digits) {
                foreach (['students.phone', 'students.guardian_phone'] as $column) {
                    $wrapped = $grammar->wrap($column);
                    $where->orWhereRaw("replace(replace(replace(replace(replace({$wrapped}, ' ', ''), '.', ''), '-', ''), '(', ''), ')', '') like ?", ['%'.$digits.'%']);
                }
            }
        });
    }

    /** @return list<string> */
    private function phoneCandidates(string $search): array
    {
        if (! preg_match('/^\+?[\d\s().\-]+$/', $search)) {
            return [];
        }

        $digits = preg_replace('/\D+/', '', $search);

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (strlen($digits) < 6) {
            return [];
        }

        $code = (string) config('eeht.phone_country_code', PhoneNumber::DEFAULT_COUNTRY_CODE);
        $candidates = [$digits];

        if (str_starts_with($digits, $code) && strlen($digits) - strlen($code) >= 6) {
            $candidates[] = substr($digits, strlen($code));
        }

        return array_values(array_unique($candidates));
    }

    private function order(Builder $query): void
    {
        match ($this->filters['sort']) {
            'recent' => $query->orderByDesc('students.id'),
            'matricule' => $query->orderBy('students.matricule'),
            // Par classe (les élèves sans classe en dernier), puis par nom : les sections de la liste se suivent sans se mêler.
            default => $query->orderByRaw('students.school_class_id is null')
                ->orderBy(SchoolClass::query()->select('name')->whereColumn('school_classes.id', 'students.school_class_id'))
                ->orderBy('students.school_class_id')
                ->orderBy('students.last_name')
                ->orderBy('students.first_name'),
        };
    }

    // ───────────────────────────── Compteurs ─────────────────────────────

    /**
     * Élèves par statut pour la portée et la recherche en cours, quel que soit le statut choisi : les pastilles de statut
     * disent ce qu'on verrait en changeant de statut. « all » est le total.
     *
     * @return array<string, int>
     */
    public function statusCounts(): array
    {
        $found = $this->query(['status'])->toBase()
            ->selectRaw('students.status as status, count(*) as total')
            ->groupBy('students.status')
            ->pluck('total', 'status');

        $counts = ['all' => (int) $found->sum()];

        foreach (array_keys(Student::STATUSES) as $status) {
            $counts[$status] = (int) ($found[$status] ?? 0);
        }

        return $counts;
    }

    /**
     * Élèves par classe sous tous les filtres : les en-têtes de section de la liste. La clé « none » = sans classe.
     *
     * @return array<string, int>
     */
    public function classCounts(): array
    {
        return $this->query()->toBase()
            ->selectRaw("coalesce(students.school_class_id, 'none') as class_key, count(*) as total")
            ->groupBy('students.school_class_id')
            ->pluck('total', 'class_key')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    // ───────────────────────────── L'arbre des promotions ─────────────────────────────

    /**
     * Les promotions de l'année choisie, avec leurs effectifs au statut choisi (ni la portée ni la recherche n'y
     * changent rien : l'arbre sert à choisir la portée). Niveau de formation (diplôme) > formation > niveau d'année >
     * classe ; une formation sans classe ni élève n'y figure pas, une classe vide y figure.
     *
     * @return array{total: int, unassigned: int, no_formation: int, incomplete: int, classes: int, groups: list<array<string, mixed>>}
     */
    public function tree(): array
    {
        $rows = $this->query(['scope', 'search', 'incomplete'])->toBase()
            ->selectRaw('students.formation_id, students.school_class_id, count(*) as total, sum(case when '.StudentDossier::incompleteSql().' then 1 else 0 end) as incomplete')
            ->groupBy('students.formation_id', 'students.school_class_id')
            ->get();

        $total = $unassigned = $noFormation = $incompleteTotal = 0;
        $byClass = $byFormation = $unassignedByFormation = [];

        foreach ($rows as $row) {
            $count = (int) $row->total;
            $incomplete = (int) $row->incomplete;
            $classId = $row->school_class_id === null ? null : (int) $row->school_class_id;
            $formationId = $row->formation_id === null ? null : (int) $row->formation_id;

            $total += $count;
            $incompleteTotal += $incomplete;

            if ($classId === null) {
                $unassigned += $count;
            } else {
                $byClass[$classId]['count'] = ($byClass[$classId]['count'] ?? 0) + $count;
                $byClass[$classId]['incomplete'] = ($byClass[$classId]['incomplete'] ?? 0) + $incomplete;
            }

            if ($formationId === null) {
                $noFormation += $count;
            } else {
                $byFormation[$formationId]['count'] = ($byFormation[$formationId]['count'] ?? 0) + $count;
                $byFormation[$formationId]['incomplete'] = ($byFormation[$formationId]['incomplete'] ?? 0) + $incomplete;

                if ($classId === null) {
                    $unassignedByFormation[$formationId] = ($unassignedByFormation[$formationId] ?? 0) + $count;
                }
            }
        }

        $classesByFormation = SchoolClass::query()
            ->with(['formationLevel:id,label,level_number', 'academicYear:id,label'])
            ->where(function (Builder $where) {
                if ($this->filters['year'] === 'all') {
                    return;
                }

                $year = (int) $this->filters['year'];
                $where->where('school_classes.academic_year_id', $year);

                if ($year === $this->currentYear) {
                    $where->orWhereNull('school_classes.academic_year_id');
                }
            })
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'formation_id', 'formation_level_id', 'academic_year_id', 'capacity'])
            ->groupBy('formation_id');

        $groups = [];
        $classTotal = 0;

        foreach (Formation::query()->orderBy('order')->orderBy('name')->get(['id', 'name', 'code', 'diploma', 'capacity', 'is_active']) as $formation) {
            $own = $classesByFormation->get($formation->id, collect());
            $stats = $byFormation[$formation->id] ?? ['count' => 0, 'incomplete' => 0];

            if ($stats['count'] === 0 && $own->isEmpty()) {
                continue;
            }

            $classNode = fn (SchoolClass $class): array => [
                'id' => $class->id,
                'name' => $class->name,
                'count' => $byClass[$class->id]['count'] ?? 0,
                'incomplete' => $byClass[$class->id]['incomplete'] ?? 0,
                'capacity' => $class->capacity === null ? null : (int) $class->capacity,
                'year' => $class->academicYear?->label,
                'level' => $class->formationLevel?->label,
            ];

            $levels = $own->whereNotNull('formation_level_id')->groupBy('formation_level_id')
                ->map(function (Collection $classes) use ($classNode) {
                    $nodes = $classes->map($classNode)->values();
                    $level = $classes->first()->formationLevel;

                    return [
                        'id' => $level?->id ?? $classes->first()->formation_level_id,
                        'label' => $level?->label ?? 'Niveau',
                        'number' => $level?->level_number ?? 0,
                        'count' => $nodes->sum('count'),
                        'incomplete' => $nodes->sum('incomplete'),
                        'classes' => $nodes->all(),
                    ];
                })
                ->sortBy('number')->values()->all();

            $classTotal += $own->count();
            $diploma = $formation->diploma !== null && $formation->diploma !== '' ? $formation->diploma : null;
            $key = $diploma ?? 'autres';

            $groups[$key] ??= [
                'key' => $key,
                'label' => $diploma ?? 'Autres formations',
                'title' => $diploma !== null ? (Formation::DIPLOMA_LABELS[$diploma] ?? null) : null,
                'rank' => $this->diplomaRank($diploma),
                'count' => 0,
                'formations' => [],
            ];

            $groups[$key]['count'] += $stats['count'];
            $groups[$key]['formations'][] = [
                'id' => $formation->id,
                'name' => $formation->name,
                'code' => $formation->code,
                'is_active' => (bool) $formation->is_active,
                'capacity' => $formation->capacity === null ? null : (int) $formation->capacity,
                'count' => $stats['count'],
                'incomplete' => $stats['incomplete'],
                'unassigned' => $unassignedByFormation[$formation->id] ?? 0,
                'levels' => $levels,
                'classes' => $own->whereNull('formation_level_id')->map($classNode)->values()->all(),
            ];
        }

        uasort($groups, fn (array $a, array $b) => [$a['rank'], $a['label']] <=> [$b['rank'], $b['label']]);

        return [
            'total' => $total,
            'unassigned' => $unassigned,
            'no_formation' => $noFormation,
            'incomplete' => $incompleteTotal,
            'classes' => $classTotal,
            'groups' => array_values(array_map(function (array $group) {
                unset($group['rank']);

                return $group;
            }, $groups)),
        ];
    }

    /** CAP, BEP, BT, BTS, DTS, CQP, CS : du plus bas au plus haut ; un diplôme inconnu après eux, « sans diplôme » en dernier. */
    private function diplomaRank(?string $diploma): int
    {
        if ($diploma === null) {
            return PHP_INT_MAX;
        }

        $position = array_search($diploma, array_keys(Formation::DIPLOMA_LABELS), true);

        return $position === false ? 1000 : $position;
    }

    // ───────────────────────────── Portée, résultats, page ─────────────────────────────

    /**
     * Où l'on se trouve, pour le fil d'Ariane et l'en-tête de la liste ; null sur l'aperçu.
     *
     * @return array<string, mixed>|null
     */
    public function scope(): ?array
    {
        if ($this->mode() === 'overview') {
            return null;
        }

        $f = $this->filters;
        $scope = ['kind' => 'all', 'title' => 'Tous les élèves', 'diploma' => null, 'formation' => null, 'level' => null, 'class' => null];

        if ($f['school_class_id'] !== '' && $f['school_class_id'] !== 'none') {
            $class = SchoolClass::query()->with(['formation:id,name,diploma', 'formationLevel:id,label', 'academicYear:id,label'])->find((int) $f['school_class_id']);

            if ($class === null) {
                return ['kind' => 'class', 'title' => 'Classe introuvable'] + $scope;
            }

            return array_merge($scope, $this->formationParts($class->formation), [
                'kind' => 'class',
                'title' => $class->name,
                'level' => $class->formationLevel ? ['id' => $class->formationLevel->id, 'label' => $class->formationLevel->label] : null,
                'class' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'capacity' => $class->capacity === null ? null : (int) $class->capacity,
                    'year' => $class->academicYear?->label,
                    'level' => $class->formationLevel?->label,
                    'active' => Student::query()->where('school_class_id', $class->id)->where('status', 'actif')->count(),
                ],
            ]);
        }

        if ($f['school_class_id'] === 'none') {
            $formation = ctype_digit($f['formation_id']) ? Formation::query()->find((int) $f['formation_id'], ['id', 'name', 'diploma']) : null;

            return array_merge($scope, $this->formationParts($formation), ['kind' => 'unassigned', 'title' => 'À affecter']);
        }

        if ($f['formation_level_id'] !== '') {
            $level = FormationLevel::query()->with('formation:id,name,diploma')->find((int) $f['formation_level_id']);

            if ($level === null) {
                return ['kind' => 'level', 'title' => 'Niveau introuvable'] + $scope;
            }

            return array_merge($scope, $this->formationParts($level->formation), ['kind' => 'level', 'title' => $level->label, 'level' => ['id' => $level->id, 'label' => $level->label]]);
        }

        if ($f['formation_id'] === 'none') {
            return array_merge($scope, ['kind' => 'no_formation', 'title' => 'Sans formation']);
        }

        if ($f['formation_id'] !== '') {
            $formation = Formation::query()->find((int) $f['formation_id'], ['id', 'name', 'diploma']);

            return array_merge($scope, $this->formationParts($formation), ['kind' => 'formation', 'title' => $formation?->name ?? 'Formation introuvable']);
        }

        if ($f['search'] !== '') {
            return array_merge($scope, ['kind' => 'search', 'title' => 'Recherche : « '.$f['search'].' »']);
        }

        if ($f['incomplete']) {
            return array_merge($scope, ['kind' => 'incomplete', 'title' => 'Dossiers à compléter']);
        }

        return $scope;
    }

    /**
     * La vue en une phrase, pour le sous-titre des exports : « BTS 1 Tourisme · 2026-2027 · élèves actifs ». Un export
     * sans aucun filtre (les anciens liens) dit « Toute l'école · toutes les années · tous les statuts ».
     */
    public function describe(): string
    {
        $scope = $this->scope();
        $where = $scope !== null && $scope['kind'] !== 'all' ? $scope['title'] : "Toute l'école";

        $year = $this->filters['year'] === 'all'
            ? null
            : AcademicYear::query()->whereKey((int) $this->filters['year'])->value('label');

        $status = self::STATUS_PHRASES[$this->filters['status']] ?? null;

        return implode(' · ', [$where, $year ?? 'toutes les années', $status ?? 'tous les statuts']);
    }

    /**
     * Début du nom de fichier d'un export : « eleves-bts-1-tourisme » pour une classe, « eleves » pour toute l'école ou
     * quand la vue est une recherche (qu'on ne met pas dans un nom de fichier).
     */
    public function exportName(): string
    {
        $scope = $this->scope();

        $label = match ($scope['kind'] ?? null) {
            'class', 'formation' => $scope['title'],
            'level' => trim(($scope['formation']['name'] ?? '').' '.$scope['title']),
            'unassigned' => 'à affecter',
            'no_formation' => 'sans formation',
            default => null,
        };

        return $label === null ? 'eleves' : 'eleves-'.Str::slug($label);
    }

    /** @return array{formation: array{id: int, name: string}|null, diploma: array{key: string, label: string}|null} */
    private function formationParts(?Formation $formation): array
    {
        if ($formation === null) {
            return ['formation' => null, 'diploma' => null];
        }

        $diploma = $formation->diploma !== null && $formation->diploma !== '' ? $formation->diploma : null;

        return [
            'formation' => ['id' => $formation->id, 'name' => $formation->name],
            'diploma' => ['key' => $diploma ?? 'autres', 'label' => $diploma ?? 'Autres formations'],
        ];
    }

    /**
     * Quand l'écran est vide parce que le statut (« actif » par défaut) ou l'année choisis écartent tout le monde :
     * combien d'élèves répondent aux autres filtres, tous statuts et toutes années confondus. Évite de conclure
     * « introuvable » ou « école vide » à tort.
     *
     * @return array{count: int}|null
     */
    public function elsewhere(): ?array
    {
        if ($this->filters['status'] === 'all' && $this->filters['year'] === 'all') {
            return null;
        }

        $count = $this->with(['status' => 'all', 'year' => 'all'])->query()->count();

        return $count > 0 ? ['count' => $count] : null;
    }

    /**
     * Les années académiques avec leur nombre d'élèves au statut choisi (le dossier sans année compte pour l'année en
     * cours, comme dans la liste), et le total de toutes les années : on voit d'un coup d'œil où sont les élèves.
     *
     * @return array{years: list<array{id: int, label: string, is_current: bool, count: int}>, all: int}
     */
    private function yearCounts(): array
    {
        // Deux colonnes simples en GROUP BY (celle de l'élève et celle de sa classe) plutôt qu'une expression : la règle
        // « la classe fait foi » s'applique ensuite ici, et MySQL n'a pas à comparer deux sous-requêtes identiques.
        $found = Student::query()
            ->when($this->filters['status'] !== 'all', fn (Builder $query) => $query->where('students.status', $this->filters['status']))
            ->toBase()
            ->leftJoin('school_classes', 'school_classes.id', '=', 'students.school_class_id')
            ->selectRaw('students.academic_year_id as student_year, school_classes.academic_year_id as class_year, count(*) as total')
            ->groupBy('students.academic_year_id', 'school_classes.academic_year_id')
            ->get();

        $perYear = [];
        $withoutYear = 0;

        foreach ($found as $row) {
            $year = $row->class_year ?? $row->student_year;

            if ($year === null) {
                $withoutYear += (int) $row->total;
            } else {
                $perYear[(int) $year] = ($perYear[(int) $year] ?? 0) + (int) $row->total;
            }
        }

        $years = AcademicYear::query()->orderByDesc('start_date')->get(['id', 'label', 'is_current'])
            ->map(fn (AcademicYear $year) => [
                'id' => $year->id,
                'label' => $year->label,
                'is_current' => (bool) $year->is_current,
                'count' => ($perYear[$year->id] ?? 0) + ($year->id === $this->currentYear ? $withoutYear : 0),
            ])->all();

        return ['years' => $years, 'all' => array_sum($perYear) + $withoutYear];
    }

    /**
     * Les propriétés Inertia de la page Élèves.
     *
     * @return array<string, mixed>
     */
    public function page(bool $canSeeFinance): array
    {
        $directory = $this->mode() === 'directory';
        $tree = $this->tree();
        $students = null;

        if ($directory) {
            $query = $this->query()->with(['formation:id,name', 'schoolClass:id,name,formation_level_id,academic_year_id', 'schoolClass.formationLevel:id,label', 'schoolClass.academicYear:id,label', 'academicYear:id,label']);
            $this->order($query);
            $paginator = $query->paginate(self::PER_PAGE)->withQueryString();
            $balances = $canSeeFinance ? $this->balances($paginator->getCollection()->pluck('id')->all()) : null;
            $students = $paginator->through(fn (Student $student) => $this->row($student, $balances));
        }

        $years = $this->yearCounts();

        return [
            'mode' => $directory ? 'directory' : 'overview',
            'filters' => [
                'year' => $this->filters['year'],
                'formation_id' => $this->filters['formation_id'],
                'formation_level_id' => $this->filters['formation_level_id'],
                'school_class_id' => $this->filters['school_class_id'],
                'status' => $this->filters['status'],
                'search' => $this->filters['search'],
                'incomplete' => $this->filters['incomplete'],
                'sort' => $this->filters['sort'],
                'list' => $this->filters['list'],
                'highlight' => $this->filters['highlight'],
            ],
            'defaults' => ['year' => $this->currentYear !== null ? (string) $this->currentYear : 'all', 'status' => 'actif'],
            'years' => $years['years'],
            'allYearsCount' => $years['all'],
            'tree' => ['total' => $tree['total'], 'unassigned' => $tree['unassigned'], 'no_formation' => $tree['no_formation'], 'groups' => $tree['groups']],
            'stats' => ['students' => $tree['total'], 'classes' => $tree['classes'], 'unassigned' => $tree['unassigned'], 'incomplete' => $tree['incomplete']],
            'statusCounts' => $this->statusCounts(),
            // Dossiers à compléter sous les autres filtres : le nombre que le bouton « À compléter » promet.
            'incompleteCount' => $this->query(['incomplete'])->whereRaw(StudentDossier::incompleteSql())->count(),
            'scope' => $this->scope(),
            'students' => $students,
            'classCounts' => $directory ? $this->classCounts() : [],
            'elsewhere' => ($directory ? $students->total() : $tree['total']) === 0 ? $this->elsewhere() : null,
            'canSeeFinance' => $canSeeFinance,
        ];
    }

    // ───────────────────────────── Une ligne par élève ─────────────────────────────

    /**
     * Solde restant dû (jamais négatif : un trop-perçu n'est pas déduit d'une autre facture) et retard d'au moins un
     * jour sur une échéance, par élève.
     *
     * @param  list<int>  $studentIds
     * @return array<int, array{balance: float, late: bool}>
     */
    private function balances(array $studentIds): array
    {
        $balances = [];

        foreach (Invoice::query()->whereIn('student_id', $studentIds)->withSum('payments', 'amount')->get() as $invoice) {
            $open = max(0, round($invoice->net_amount - (float) ($invoice->payments_sum_amount ?? 0), 2));

            $balances[$invoice->student_id] ??= ['balance' => 0.0, 'late' => false];
            $balances[$invoice->student_id]['balance'] += $open;
            $balances[$invoice->student_id]['late'] = $balances[$invoice->student_id]['late'] || ($open > 0 && ($invoice->daysPastDue() ?? 0) > 0);
        }

        return $balances;
    }

    /**
     * La fiche d'un élève telle que la liste l'affiche : identité, rattachement, contact, dossier. Les données de santé
     * ne partent jamais dans la liste, le solde seulement vers qui peut voir la comptabilité.
     *
     * @param  array<int, array{balance: float, late: bool}>|null  $balances  null : l'utilisateur n'a pas accès aux finances
     */
    private function row(Student $student, ?array $balances): array
    {
        $code = (string) config('eeht.phone_country_code', PhoneNumber::DEFAULT_COUNTRY_CODE);
        $own = PhoneNumber::international($student->phone, $code);
        $guardian = PhoneNumber::international($student->guardian_phone, $code);
        $owner = $own !== null ? 'student' : ($guardian !== null ? 'guardian' : null);
        $source = match ($owner) {
            'student' => $student->phone,
            'guardian' => $student->guardian_phone,
            default => null,
        };

        $row = [
            'id' => $student->id,
            'matricule' => $student->matricule,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'gender' => $student->gender,
            'status' => $student->status,
            'is_repeating' => (bool) $student->is_repeating,
            'photo_url' => filled($student->photo) ? '/storage/'.ltrim($student->photo, '/') : null,
            'birth_date' => $student->birth_date?->toDateString(),
            'birth_place' => $student->birth_place,
            'address' => $student->address,
            'phone' => $student->phone,
            'phone_display' => PhoneNumber::display($student->phone, $code),
            'email' => $student->email,
            'professional_email' => $student->professional_email,
            'emergency_contact' => $student->emergency_contact,
            'formation' => $student->formation ? ['id' => $student->formation->id, 'name' => $student->formation->name] : null,
            'school_class' => $student->schoolClass ? ['id' => $student->schoolClass->id, 'name' => $student->schoolClass->name] : null,
            'level' => $student->schoolClass?->formationLevel?->label,
            'year' => ($student->schoolClass?->academicYear ?? $student->academicYear)?->label,
            'contact' => [
                'owner' => $owner,
                'display' => PhoneNumber::display($source, $code),
                'tel' => $owner === 'student' ? $own : ($owner === 'guardian' ? $guardian : null),
                'whatsapp' => PhoneNumber::whatsapp($source, $code),
                'email' => filled($student->email) ? $student->email : (filled($student->guardian_email) ? $student->guardian_email : null),
            ],
            'guardian' => [
                'name' => $student->guardian_name,
                'phone' => PhoneNumber::display($student->guardian_phone, $code),
                'email' => $student->guardian_email,
            ],
            'dossier' => StudentDossier::summarize($student),
            'created_at' => $student->created_at?->toIso8601String(),
        ];

        if ($balances !== null) {
            $row['balance'] = $balances[$student->id]['balance'] ?? 0.0;
            $row['late'] = $balances[$student->id]['late'] ?? false;
        }

        return $row;
    }
}

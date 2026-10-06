<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AlertThreshold;
use App\Models\AppreciationTemplate;
use App\Models\CouncilMember;
use App\Models\CouncilVote;
use App\Models\DecisionType;
use App\Models\DisciplineRecord;
use App\Models\Formation;
use App\Models\InternshipCriterion;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Support\CouncilSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paramétrage du module Conseil de classe (écran E12). Lecture : `voir_parametrage_conseils` ; toute écriture :
 * `modifier_parametrage_conseils` (voir routes/web.php). Chaque changement est écrit au journal d'activité (« conseils »).
 */
class CouncilSettingsController extends Controller
{
    public function index(): Response
    {
        $pairs = DB::table('decision_type_incompatibilities')->get(['decision_type_id', 'incompatible_type_id']);

        $incompatible = [];
        foreach ($pairs as $pair) {
            $incompatible[$pair->decision_type_id][] = (int) $pair->incompatible_type_id;
            $incompatible[$pair->incompatible_type_id][] = (int) $pair->decision_type_id;
        }

        $usedTypes = DB::getSchemaBuilder()->hasTable('council_decisions')
            ? DB::table('council_decisions')->distinct()->pluck('decision_type_id')->all()
            : [];

        $thresholds = ['default' => [], 'formations' => []];
        foreach (AlertThreshold::all() as $row) {
            $values = $row->only(['max_average', 'unjustified_absence_hours', 'failed_subjects_count', 'progression_drop', 'sanction_level']);

            if ($row->formation_id === null) {
                $thresholds['default'][$row->level] = $values;
            } else {
                $thresholds['formations'][$row->formation_id][$row->level] = $values;
            }
        }

        $categoryOrder = array_flip(array_keys(DecisionType::CATEGORIES));

        return Inertia::render('Admin/CouncilSettings/Index', [
            'decisionTypes' => DecisionType::all()
                ->sortBy(fn (DecisionType $type) => sprintf('%d-%05d-%s', $categoryOrder[$type->category] ?? 9, $type->sort_order, $type->label))
                ->values()
                ->map(fn (DecisionType $type) => $type->toArray() + [
                    'incompatible_ids' => array_values(array_unique($incompatible[$type->id] ?? [])),
                    'is_used' => in_array($type->id, $usedTypes, true),
                ]),
            'categories' => DecisionType::CATEGORIES,
            'tones' => DecisionType::TONES,
            'mentions' => config('eeht.mention_labels'),
            'reportDecisions' => collect(config('eeht.decision_labels'))->except('non_defini')->all(),
            'thresholds' => $thresholds,
            'thresholdLevels' => AlertThreshold::LEVELS,
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'sanctionLevels' => DisciplineRecord::LEVELS,
            'subjectGroups' => SubjectGroup::withCount('subjects')->orderBy('sort_order')->orderBy('label')->get(),
            'subjects' => Subject::with('formation:id,name')->orderBy('name')->get()
                ->map(fn (Subject $subject) => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'formation' => $subject->formation?->name,
                    'coefficient' => (float) $subject->coefficient,
                    'subject_group_id' => $subject->subject_group_id,
                ]),
            'rules' => CouncilSettings::all(),
            'placeholders' => CouncilSettings::PLACEHOLDERS,
            'voteOptions' => [
                'functions' => collect(CouncilSettings::VOTING_FUNCTIONS)->mapWithKeys(fn (string $function) => [$function => CouncilMember::FUNCTIONS[$function]])->all(),
                'majorities' => CouncilVote::MAJORITIES,
                'secrecies' => CouncilVote::SECRECIES,
                'modes' => CouncilVote::MODES,
            ],
            'appreciations' => AppreciationTemplate::orderBy('level')->orderBy('theme')->orderBy('sort_order')->get(['id', 'level', 'theme', 'text', 'is_active']),
            'appreciationLevels' => AppreciationTemplate::LEVELS,
            'appreciationThemes' => AppreciationTemplate::THEMES,
            'internshipCriteria' => InternshipCriterion::orderBy('sort_order')->orderBy('label')->get(['id', 'label', 'is_active', 'sort_order']),
        ]);
    }

    // --- Types de décision ----------------------------------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function typeRules(): array
    {
        return [
            'label' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(array_keys(DecisionType::CATEGORIES))],
            'color' => ['required', Rule::in(array_keys(DecisionType::TONES))],
            'is_active' => ['boolean'],
            'is_published_on_report' => ['boolean'],
            'is_end_of_year_only' => ['boolean'],
            'requires_vote' => ['boolean'],
            'creates_follow_up' => ['boolean'],
            'requires_reason' => ['boolean'],
            'report_mention' => ['nullable', Rule::in(array_keys(config('eeht.mention_labels')))],
            'report_decision' => ['nullable', Rule::in(array_keys(config('eeht.decision_labels')))],
        ];
    }

    /** @param  array<string, mixed>  $data */
    private function normalizeType(array $data): array
    {
        foreach (['is_active', 'is_published_on_report', 'is_end_of_year_only', 'requires_vote', 'creates_follow_up', 'requires_reason'] as $flag) {
            $data[$flag] = (bool) ($data[$flag] ?? false);
        }

        // RG-10 : une décision d'orientation n'est proposée qu'en fin d'année.
        if ($data['category'] === DecisionType::ORIENTATION) {
            $data['is_end_of_year_only'] = true;
        }

        return $data;
    }

    public function storeDecisionType(Request $request)
    {
        $data = $request->validate($this->typeRules() + [
            'code' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/', 'unique:decision_types,code'],
        ], [
            'code.regex' => 'Le code ne contient que des lettres minuscules, des chiffres et des tirets bas (ex. : tableau_honneur).',
            'code.unique' => 'Ce code est déjà utilisé par un autre type de décision.',
        ]);
        $data = $this->normalizeType($data);

        $data['sort_order'] = ((int) DecisionType::where('category', $data['category'])->max('sort_order')) + 10;

        $type = DecisionType::create($data);

        return back()->with('success', "Type de décision « {$type->label} » créé.");
    }

    public function updateDecisionType(Request $request, DecisionType $decisionType)
    {
        $data = $this->normalizeType($request->validate($this->typeRules()));

        // Le code est la clé du type et la catégorie fixe ses règles de cumul : ni l'un ni l'autre ne bougent dès que le
        // type figure dans une décision de conseil.
        unset($data['code']);
        if ($decisionType->isUsed()) {
            $data['category'] = $decisionType->category;
            $data = $this->normalizeType($data);
        }

        $decisionType->update($data);

        return back()->with('success', "Type de décision « {$decisionType->label} » enregistré.");
    }

    public function destroyDecisionType(DecisionType $decisionType)
    {
        if ($decisionType->isUsed()) {
            return back()->with('error', "« {$decisionType->label} » figure dans des décisions de conseil : désactivez-le plutôt que de le supprimer.");
        }

        $label = $decisionType->label;
        $decisionType->delete();

        return back()->with('success', "Type de décision « {$label} » supprimé.");
    }

    public function syncIncompatibilities(Request $request, DecisionType $decisionType)
    {
        $data = $request->validate([
            'incompatible_ids' => ['nullable', 'array'],
            'incompatible_ids.*' => ['integer'],
        ]);

        $before = $decisionType->incompatibleIds();
        $decisionType->syncIncompatibilities($data['incompatible_ids'] ?? []);

        activity('conseils')->causedBy($request->user())->performedOn($decisionType)
            ->withProperties(['old' => $before, 'new' => $decisionType->incompatibleIds()])
            ->log("Incompatibilités de « {$decisionType->label} » mises à jour");

        return back()->with('success', 'Incompatibilités enregistrées.');
    }

    // --- Seuils d'alerte ------------------------------------------------------------------------------------------------

    public function updateThresholds(Request $request)
    {
        $rules = ['formation_id' => ['nullable', 'integer', 'exists:formations,id']];

        foreach (array_keys(AlertThreshold::LEVELS) as $level) {
            $rules += [
                $level => ['required', 'array'],
                "{$level}.max_average" => ['nullable', 'numeric', 'between:0,20'],
                "{$level}.unjustified_absence_hours" => ['nullable', 'numeric', 'between:0,999'],
                "{$level}.failed_subjects_count" => ['nullable', 'integer', 'between:0,50'],
                "{$level}.progression_drop" => ['nullable', 'numeric', 'between:0,20'],
                "{$level}.sanction_level" => ['nullable', Rule::in(array_keys(DisciplineRecord::LEVELS))],
            ];
        }

        $data = $request->validate($rules);
        $formationId = $data['formation_id'] ?? null;

        DB::transaction(function () use ($data, $formationId) {
            foreach (array_keys(AlertThreshold::LEVELS) as $level) {
                $values = $data[$level];

                AlertThreshold::saveFor($formationId, $level, [
                    'max_average' => $values['max_average'] ?? null,
                    'unjustified_absence_hours' => $values['unjustified_absence_hours'] ?? null,
                    'failed_subjects_count' => $values['failed_subjects_count'] ?? null,
                    'progression_drop' => $values['progression_drop'] ?? null,
                    'sanction_level' => $values['sanction_level'] ?? null,
                ]);
            }
        });

        return back()->with('success', $formationId ? 'Seuils de la formation enregistrés.' : "Seuils par défaut de l'école enregistrés.");
    }

    public function resetThresholds(Request $request, Formation $formation)
    {
        AlertThreshold::where('formation_id', $formation->id)->get()->each->delete();

        activity('conseils')->causedBy($request->user())->performedOn($formation)->log("Seuils d'alerte de « {$formation->name} » remis aux valeurs par défaut");

        return back()->with('success', "« {$formation->name} » reprend les seuils par défaut de l'école.");
    }

    // --- Groupes de matières --------------------------------------------------------------------------------------------

    public function storeSubjectGroup(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9_]+$/', 'unique:subject_groups,code'],
            'label' => ['required', 'string', 'max:120'],
        ], [
            'code.regex' => 'Le code ne contient que des lettres minuscules, des chiffres et des tirets bas.',
            'code.unique' => 'Ce code est déjà utilisé par un autre groupe.',
        ]);

        SubjectGroup::create($data + ['sort_order' => ((int) SubjectGroup::max('sort_order')) + 10]);

        return back()->with('success', "Groupe « {$data['label']} » créé.");
    }

    public function updateSubjectGroup(Request $request, SubjectGroup $subjectGroup)
    {
        $data = $request->validate(['label' => ['required', 'string', 'max:120']]);

        $subjectGroup->update($data);

        return back()->with('success', 'Groupe enregistré.');
    }

    public function destroySubjectGroup(SubjectGroup $subjectGroup)
    {
        // Le groupe « Stage » porte une règle (RG-03 : le stage est une appréciation, hors moyenne).
        if ($subjectGroup->code === SubjectGroup::INTERNSHIP) {
            return back()->with('error', 'Le groupe « Stage » est nécessaire au calcul des moyennes : il ne se supprime pas.');
        }

        $label = $subjectGroup->label;
        $subjectGroup->delete();

        return back()->with('success', "Groupe « {$label} » supprimé ; ses matières ne sont plus classées.");
    }

    public function assignSubjects(Request $request)
    {
        $data = $request->validate([
            'assignments' => ['required', 'array'],
            'assignments.*.subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'assignments.*.subject_group_id' => ['nullable', 'integer', 'exists:subject_groups,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['assignments'] as $assignment) {
                Subject::whereKey($assignment['subject_id'])->update(['subject_group_id' => $assignment['subject_group_id'] ?? null]);
            }
        });

        activity('conseils')->causedBy($request->user())->withProperties(['count' => count($data['assignments'])])
            ->log('Matières rattachées aux groupes du conseil');

        return back()->with('success', 'Rattachement des matières enregistré.');
    }

    // --- Validation du PV et recours ------------------------------------------------------------------------------------

    public function updateRules(Request $request)
    {
        $data = $request->validate([
            'double_validation' => ['required', 'boolean'],
            'appeal_days' => ['required', 'integer', 'between:1,60'],
            'default_absence_hours' => ['required', 'numeric', 'between:0.25,8'],
        ]);

        $before = CouncilSettings::all();
        CouncilSettings::update($data);

        activity('conseils')->causedBy($request->user())
            ->withProperties(['old' => $before, 'new' => CouncilSettings::all()])
            ->log('Règles de validation et de recours du conseil modifiées');

        return back()->with('success', 'Règles enregistrées.');
    }

    /** PAR-08 : fonctions votantes, majorité, voix prépondérante, secret, mode proposé par défaut. */
    public function updateVoteRules(Request $request)
    {
        $data = $request->validate([
            'vote_functions' => ['required', 'array', 'min:1'],
            'vote_functions.*' => ['string', Rule::in(CouncilSettings::VOTING_FUNCTIONS)],
            'vote_majority' => ['required', Rule::in(array_keys(CouncilVote::MAJORITIES))],
            'vote_casting' => ['required', 'boolean'],
            'vote_secrecy' => ['required', Rule::in(array_keys(CouncilVote::SECRECIES))],
            'vote_mode' => ['required', Rule::in(array_keys(CouncilVote::MODES))],
        ]);
        $data['vote_functions'] = array_values(array_unique($data['vote_functions']));
        $data['vote_casting'] = (bool) $data['vote_casting'];

        $before = CouncilSettings::all();
        CouncilSettings::update($data);

        activity('conseils')->causedBy($request->user())
            ->withProperties(['old' => $before, 'new' => CouncilSettings::all()])
            ->log('Règles de vote du conseil modifiées');

        return back()->with('success', 'Règles de vote enregistrées.');
    }

    /** PAR-10 : message aux familles à la clôture ; il doit renvoyer vers l'espace de la famille ({lien}). */
    public function updateMessages(Request $request)
    {
        $data = $request->validate([
            'family_notify' => ['required', 'boolean'],
            'family_subject' => ['required', 'string', 'max:150'],
            'family_message' => ['required', 'string', 'max:1000', function (string $attribute, mixed $value, \Closure $fail) {
                if (! str_contains((string) $value, '{lien}')) {
                    $fail('Le message doit contenir {lien} : la famille lit les résultats dans son espace.');
                }
            }],
        ]);
        $data['family_notify'] = (bool) $data['family_notify'];

        $before = CouncilSettings::all();
        CouncilSettings::update($data);

        activity('conseils')->causedBy($request->user())
            ->withProperties(['old' => $before, 'new' => CouncilSettings::all()])
            ->log('Message aux familles des conseils modifié');

        return back()->with('success', 'Message aux familles enregistré.');
    }

    // --- Banque d'appréciations (PAR-06) et grille de stage (PAR-07) -------------------------------------------------

    /** @return array<string, mixed> */
    private function templateRules(): array
    {
        return [
            'level' => ['required', Rule::in(array_keys(AppreciationTemplate::LEVELS))],
            'theme' => ['required', Rule::in(array_keys(AppreciationTemplate::THEMES))],
            'text' => ['required', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }

    public function storeTemplate(Request $request)
    {
        $data = $request->validate($this->templateRules());
        AppreciationTemplate::create($data + ['sort_order' => ((int) AppreciationTemplate::max('sort_order')) + 1]);

        return back()->with('success', 'Phrase ajoutée à la banque.');
    }

    public function updateTemplate(Request $request, AppreciationTemplate $appreciationTemplate)
    {
        $appreciationTemplate->update($request->validate($this->templateRules()));

        return back()->with('success', 'Phrase enregistrée.');
    }

    public function destroyTemplate(AppreciationTemplate $appreciationTemplate)
    {
        // Une phrase insérée est copiée dans l'appréciation : la supprimer ne change aucune saisie.
        $appreciationTemplate->delete();

        return back()->with('success', 'Phrase supprimée de la banque.');
    }

    public function storeCriterion(Request $request)
    {
        $data = $request->validate(['label' => ['required', 'string', 'max:160']]);
        InternshipCriterion::create($data + ['sort_order' => ((int) InternshipCriterion::max('sort_order')) + 10]);

        return back()->with('success', 'Critère ajouté à la grille de stage.');
    }

    public function updateCriterion(Request $request, InternshipCriterion $internshipCriterion)
    {
        $internshipCriterion->update($request->validate(['label' => ['required', 'string', 'max:160'], 'is_active' => ['boolean']]));

        return back()->with('success', 'Critère enregistré.');
    }

    public function destroyCriterion(InternshipCriterion $internshipCriterion)
    {
        if (DB::table('council_internship_evaluations')->where('criterion_id', $internshipCriterion->id)->exists()) {
            $internshipCriterion->update(['is_active' => false]);

            return back()->with('success', 'Ce critère a déjà servi : il est désactivé plutôt que supprimé.');
        }

        $internshipCriterion->delete();

        return back()->with('success', 'Critère supprimé.');
    }
}

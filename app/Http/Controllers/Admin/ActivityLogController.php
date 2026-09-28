<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    private const LOG_LABELS = [
        'personnel' => 'Personnel',
        'eleves' => 'Élèves',
        'enseignants' => 'Enseignants',
        'comptabilite' => 'Comptabilité',
        'salaires' => 'Salaires',
        'candidatures' => 'Candidatures',
        'roles' => 'Rôles & permissions',
    ];

    private const SUBJECT_LABELS = [
        'User' => 'Membre du personnel',
        'Student' => 'Élève',
        'Teacher' => 'Enseignant',
        'Invoice' => 'Facture',
        'Payment' => 'Paiement',
        'Expense' => 'Dépense',
        'SalaryPayment' => 'Salaire',
        'JournalEntry' => 'Écriture comptable',
        'Candidature' => 'Candidature',
    ];

    private const EVENT_LABELS = [
        'created' => 'créé(e)',
        'updated' => 'modifié(e)',
        'deleted' => 'supprimé(e)',
    ];

    private function describe(string $description, ?string $subjectType, ?string $event): string
    {
        if ($event === null || $description !== $event) {
            return $description;
        }

        $subject = self::SUBJECT_LABELS[$subjectType] ?? $subjectType ?? 'Élément';
        $action = self::EVENT_LABELS[$event] ?? $event;

        return "{$subject} {$action}";
    }

    public function index(Request $request): Response
    {
        $query = Activity::with('causer')->latest();

        if ($request->filled('log_name')) {
            $query->where('log_name', $request->string('log_name'));
        }

        if ($request->filled('causer_id')) {
            $query->where('causer_id', $request->integer('causer_id'))->where('causer_type', User::class);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->string('to'));
        }

        $activities = $query->paginate(25)->withQueryString();

        $activities->getCollection()->transform(function (Activity $activity) {
            $subjectType = $activity->subject_type ? class_basename($activity->subject_type) : null;

            return [
                'id' => $activity->id,
                'log_name' => $activity->log_name,
                'log_label' => self::LOG_LABELS[$activity->log_name] ?? $activity->log_name,
                'description' => $this->describe($activity->description, $subjectType, $activity->event),
                'subject_type' => $subjectType,
                'event' => $activity->event,
                'causer_name' => $activity->causer?->name ?? 'Système',
                'properties' => $activity->properties,
                'attribute_changes' => $activity->attribute_changes,
                'created_at' => $activity->created_at->toDateTimeString(),
            ];
        });

        return Inertia::render('Admin/ActivityLog/Index', [
            'activities' => $activities,
            'logNames' => self::LOG_LABELS,
            'staff' => User::adminStaff()->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['log_name', 'causer_id', 'from', 'to']),
        ]);
    }
}

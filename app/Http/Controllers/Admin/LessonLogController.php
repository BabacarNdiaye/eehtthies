<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LessonLog;
use App\Models\SchoolClass;
use App\Models\Teacher;
use App\Support\Exportable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Read-only oversight of the cahier de texte teachers fill from their own portal. */
class LessonLogController extends Controller
{
    use Exportable;

    private function query(Request $request)
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;
        $teacherId = $request->integer('teacher_id') ?: null;
        $from = $request->string('from')->toString() ?: now()->subDays(30)->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        return LessonLog::when($schoolClassId, fn ($q) => $q->where('school_class_id', $schoolClassId))
            ->when($teacherId, fn ($q) => $q->where('teacher_id', $teacherId))
            // whereDate, not whereBetween on the raw column — see AttendanceController::registerQuery().
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->with(['teacher:id,first_name,last_name', 'schoolClass:id,name', 'subject:id,name'])
            ->orderByDesc('date');
    }

    public function index(Request $request): Response
    {
        $logs = $this->query($request)->paginate(30)->withQueryString();

        return Inertia::render('Admin/LessonLog/Index', [
            'logs' => $logs,
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'teachers' => Teacher::orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'selectedClassId' => $request->integer('school_class_id') ?: null,
            'selectedTeacherId' => $request->integer('teacher_id') ?: null,
            'from' => $request->string('from')->toString() ?: now()->subDays(30)->toDateString(),
            'to' => $request->string('to')->toString() ?: now()->toDateString(),
        ]);
    }

    public function pdf(Request $request)
    {
        $rows = $this->query($request)->get()->map(fn (LessonLog $log) => [
            'date' => $log->date->format('d/m/Y'),
            'class' => $log->schoolClass->name ?? '—',
            'subject' => $log->subject->name ?? '—',
            'teacher' => $log->teacher ? "{$log->teacher->first_name} {$log->teacher->last_name}" : '—',
            'content' => $log->content,
            'homework' => $log->homework ?? '—',
        ]);

        return $this->pdfResponse(
            'cahier-de-texte.pdf',
            'Cahier de texte',
            [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'class', 'label' => 'Classe'],
                ['key' => 'subject', 'label' => 'Matière'],
                ['key' => 'teacher', 'label' => 'Enseignant'],
                ['key' => 'content', 'label' => 'Contenu de la séance'],
                ['key' => 'homework', 'label' => 'Devoirs'],
            ],
            $rows
        );
    }
}

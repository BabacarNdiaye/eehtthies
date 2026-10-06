<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Exam;
use App\Models\LessonLog;
use App\Models\SchoolClass;
use App\Models\TimetableEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Rappels automatiques d'EEHT Connect : examens à venir et devoirs dans le
 * groupe de la classe, changements d'emploi du temps regroupés, absences et
 * retards dans la conversation « Assistant EEHT Connect » de l'élève (et de
 * son parent).
 */
class ConnectReminders
{
    /** Heure à partir de laquelle les rappels d'examens du jour partent. */
    public const EXAM_REMINDER_HOUR = 7;

    public function __construct(
        private readonly Messenger $messenger,
        private readonly ClassGroupSync $classGroups,
    ) {}

    /** Enregistre la clé et renvoie true si le rappel n'avait pas encore été envoyé. */
    private function claim(string $key): bool
    {
        return DB::table('connect_reminders')->insertOrIgnore(['key' => $key, 'sent_at' => now()]) === 1;
    }

    private function postToClass(int $schoolClassId, string $body, array $meta): void
    {
        $class = SchoolClass::find($schoolClassId);
        if ($class) {
            $this->messenger->sendSystem($this->classGroups->syncClass($class), $body, $meta);
        }
    }

    private static function day(Carbon $date): string
    {
        return $date->locale('fr')->translatedFormat('l j F');
    }

    // ---------------------------------------------------------------
    // Examens
    // ---------------------------------------------------------------

    /** @return int nombre de rappels envoyés */
    public function remindExams(): int
    {
        if (now()->hour < self::EXAM_REMINDER_HOUR) {
            return 0;
        }

        $sent = 0;
        $windows = ['j1' => today()->addDay(), 'j7' => today()->addDays(7)];

        foreach ($windows as $suffix => $date) {
            $exams = Exam::whereDate('exam_date', $date)->with('subject:id,name')->get();

            foreach ($exams as $exam) {
                if (! $this->claim("exam:{$exam->id}:{$suffix}")) {
                    continue;
                }

                $type = Exam::TYPES[$exam->type] ?? 'Évaluation';
                $subject = $exam->subject?->name ? " de {$exam->subject->name}" : '';
                $when = $suffix === 'j1' ? 'demain ('.self::day($date).')' : 'dans une semaine ('.self::day($date).')';
                $time = $exam->start_time ? ' à '.substr($exam->start_time, 0, 5) : '';
                $icon = $suffix === 'j1' ? '📝' : '📅';

                $this->postToClass(
                    $exam->school_class_id,
                    "{$icon} Rappel : {$type}{$subject} {$when}{$time} — « {$exam->title} ».",
                    ['type' => 'exam', 'exam_id' => $exam->id, 'when' => $suffix],
                );
                $sent++;
            }
        }

        return $sent;
    }

    // ---------------------------------------------------------------
    // Devoirs (cahier de texte)
    // ---------------------------------------------------------------

    public function announceHomework(LessonLog $log): void
    {
        $homework = \App\Support\RichText::plain($log->homework);
        if ($homework === '' || ! $log->school_class_id) {
            return;
        }

        if (! $this->claim("lesson:{$log->id}:".md5($homework))) {
            return;
        }

        $log->loadMissing('subject:id,name', 'teacher:id,first_name,last_name');
        $subject = $log->subject?->name ? " en {$log->subject->name}" : '';
        $teacher = $log->teacher ? " par {$log->teacher->first_name} {$log->teacher->last_name}" : '';
        $date = $log->date ? ' le '.$log->date->format('d/m') : '';

        $this->postToClass(
            $log->school_class_id,
            "📚 Devoir donné{$subject}{$date}{$teacher} :\n{$homework}",
            ['type' => 'homework', 'lesson_log_id' => $log->id],
        );
    }

    // ---------------------------------------------------------------
    // Emploi du temps
    // ---------------------------------------------------------------

    public static function describeEntry(TimetableEntry $entry): string
    {
        $entry->loadMissing('subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name');

        return collect([
            (TimetableEntry::DAYS[$entry->day_of_week] ?? '').' '.substr((string) $entry->start_time, 0, 5).'–'.substr((string) $entry->end_time, 0, 5),
            $entry->subject?->name,
            $entry->teacher ? "{$entry->teacher->first_name} {$entry->teacher->last_name}" : null,
            $entry->room?->name,
        ])->filter()->implode(' · ');
    }

    public function recordTimetableChange(TimetableEntry $entry, string $type): void
    {
        if (! $entry->school_class_id) {
            return;
        }

        DB::table('connect_pending_events')->insert([
            'school_class_id' => $entry->school_class_id,
            'type' => $type,
            'description' => mb_strimwidth(self::describeEntry($entry), 0, 250, '…'),
            'created_at' => now(),
        ]);
    }

    /**
     * Publie un seul message par classe pour tous les changements d'emploi du
     * temps accumulés (une saisie complète par l'administration ne produit
     * donc pas des dizaines de messages).
     */
    public function flushTimetableChanges(): int
    {
        $events = DB::table('connect_pending_events')->orderBy('id')->get();
        if ($events->isEmpty()) {
            return 0;
        }

        $labels = ['created' => 'Ajout', 'updated' => 'Modification', 'deleted' => 'Suppression'];

        foreach ($events->groupBy('school_class_id') as $classId => $classEvents) {
            $lines = $classEvents->take(8)->map(fn ($e) => '• '.($labels[$e->type] ?? 'Changement').' : '.$e->description);
            $more = $classEvents->count() - 8;

            $this->postToClass(
                (int) $classId,
                "🕒 L'emploi du temps de la classe a été mis à jour :\n".$lines->implode("\n").($more > 0 ? "\n… et {$more} autre(s) changement(s)." : ''),
                ['type' => 'timetable'],
            );
        }

        DB::table('connect_pending_events')->whereIn('id', $events->pluck('id'))->delete();

        return $events->groupBy('school_class_id')->count();
    }

    // ---------------------------------------------------------------
    // Absences et retards
    // ---------------------------------------------------------------

    public function announceAttendance(Attendance $attendance): void
    {
        if (! in_array($attendance->status, ['absent', 'retard'], true)) {
            return;
        }

        $attendance->loadMissing('student.user', 'student.parentUser', 'subject:id,name');
        $student = $attendance->student;
        if (! $student) {
            return;
        }

        $what = $attendance->status === 'absent' ? '⚠️ Absence enregistrée' : '⏰ Retard enregistré';
        $subject = $attendance->subject?->name ? " en {$attendance->subject->name}" : '';
        $date = $attendance->date?->format('d/m/Y');
        $meta = ['type' => 'attendance', 'status' => $attendance->status, 'attendance_id' => $attendance->id];

        if ($student->user) {
            $this->messenger->sendSystem(
                $this->messenger->assistantConversation($student->user),
                "{$what} le {$date}{$subject}. En cas d'erreur ou pour la justifier, contactez la vie scolaire.",
                $meta,
            );
        }

        if ($student->parentUser) {
            $this->messenger->sendSystem(
                $this->messenger->assistantConversation($student->parentUser),
                "{$what} pour {$student->first_name} {$student->last_name} le {$date}{$subject}.",
                $meta,
            );
        }
    }

    /**
     * Appelle un rappel déclenché par un événement (enregistrement d'une
     * absence, d'un devoir…) sans jamais faire échouer l'enregistrement
     * lui-même.
     */
    public static function safely(callable $callback): void
    {
        try {
            $callback(app(self::class));
        } catch (Throwable $e) {
            report($e);
        }
    }
}

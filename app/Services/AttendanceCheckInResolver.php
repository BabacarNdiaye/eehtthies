<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\TimetableEntry;
use Illuminate\Support\Carbon;

/**
 * Point de vérité unique pour transformer un événement de présence brut (un scan QR ou l'enregistrement
 * manuel d'un enseignant) en ligne Attendance, et pour classer présent ou en retard en comparant l'heure de
 * l'événement à l'heure de début prévue du TimetableEntry de la classe.
 * TimetableController::assertNoConflict() garantit que deux entrées d'un même school_class_id ne se
 * chevauchent jamais, donc « la période en cours en ce moment pour cette classe » est toujours sans
 * ambiguïté.
 */
class AttendanceCheckInResolver
{
    /** Le TimetableEntry actuellement en cours pour cette classe à $at (par défaut maintenant). */
    public function activePeriod(int $schoolClassId, ?Carbon $at = null): ?TimetableEntry
    {
        $at ??= now();

        return TimetableEntry::where('school_class_id', $schoolClassId)
            ->where('day_of_week', $at->dayOfWeekIso)
            ->whereTime('start_time', '<=', $at->format('H:i:s'))
            ->whereTime('end_time', '>', $at->format('H:i:s'))
            ->orderBy('start_time')
            ->first();
    }

    /**
     * Le créneau prévu correspondant à un triplet (classe, matière, date) — utilisé par le flux manuel ou en
     * lot, qui n'a pas de « maintenant » réel à comparer.
     */
    public function scheduledPeriod(int $schoolClassId, ?int $subjectId, string $date): ?TimetableEntry
    {
        if (! $subjectId) {
            return null;
        }

        return TimetableEntry::where('school_class_id', $schoolClassId)
            ->where('subject_id', $subjectId)
            ->where('day_of_week', Carbon::parse($date)->dayOfWeekIso)
            ->first();
    }

    /** ['status' => present|retard, 'late_minutes' => int] pour une arrivée à $at pendant $entry. */
    public function classify(TimetableEntry $entry, Carbon $at): array
    {
        $graceMinutes = (int) config('eeht.late_grace_minutes', 5);
        $start = Carbon::parse($at->toDateString().' '.$entry->start_time);
        $lateMinutes = max(0, (int) floor($start->diffInMinutes($at, false)));

        return $lateMinutes > $graceMinutes
            ? ['status' => 'retard', 'late_minutes' => $lateMinutes]
            : ['status' => 'present', 'late_minutes' => 0];
    }

    /** Chemin d'écriture unique pour un scan de QR ou de badge (borne en salle de classe ou portique). */
    public function recordScan(int $studentId, int $schoolClassId, string $date, ?int $recordedBy): Attendance
    {
        $now = now();
        $entry = $this->activePeriod($schoolClassId, $now);

        $status = 'present';
        $timetableEntryId = null;
        $checkedInAt = null;

        if ($entry) {
            $status = $this->classify($entry, $now)['status'];
            $timetableEntryId = $entry->id;
            $checkedInAt = $now;
        }

        return Attendance::updateOrCreate(
            [
                'student_id' => $studentId,
                'date' => $date,
                'subject_id' => null,
            ],
            [
                'school_class_id' => $schoolClassId,
                'timetable_entry_id' => $timetableEntryId,
                'status' => $status,
                'checked_in_at' => $checkedInAt,
                'justification' => null,
                'recorded_by' => $recordedBy,
            ]
        );
    }

    /**
     * Chemin d'écriture unique pour un enregistrement manuel ou en lot des présences (administration ou
     * portail enseignant). Le statut est toujours la valeur choisie par l'humain — un enregistrement en lot
     * n'a pas d'horodatage d'arrivée fiable par élève, donc le retard n'y est jamais déduit (voir
     * AttendanceController::store() pour la raison). Le TimetableEntry correspondant est tout de même lié
     * quand il existe, afin que le registre puisse regrouper par séance même pour des lignes saisies à la
     * main.
     */
    public function recordAttendance(
        int $studentId,
        int $schoolClassId,
        ?int $subjectId,
        string $date,
        string $status,
        ?string $justification,
        ?int $recordedBy,
        ?TimetableEntry $entry = null,
    ): Attendance {
        $entry ??= $this->scheduledPeriod($schoolClassId, $subjectId, $date);

        return Attendance::updateOrCreate(
            [
                'student_id' => $studentId,
                'date' => $date,
                'subject_id' => $subjectId,
            ],
            [
                'school_class_id' => $schoolClassId,
                'timetable_entry_id' => $entry?->id,
                'status' => $status,
                'justification' => $justification,
                'recorded_by' => $recordedBy,
            ]
        );
    }
}

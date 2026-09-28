<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\TimetableEntry;
use Illuminate\Support\Carbon;

/**
 * Single point of truth for turning a raw attendance event (a QR scan, or a
 * teacher's manual save) into an Attendance row, and for classifying
 * present-vs-retard by comparing the event time to the class's scheduled
 * TimetableEntry::start_time. TimetableController::assertNoConflict()
 * guarantees no two entries for the same school_class_id ever overlap, so
 * "the period in session right now for this class" is always unambiguous.
 */
class AttendanceCheckInResolver
{
    /** The TimetableEntry actively in session for this class at $at (default now). */
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
     * The scheduled slot a (class, subject, date) triple corresponds to — used
     * by the manual/bulk flow, which has no live "now" to match against.
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

    /** ['status' => present|retard, 'late_minutes' => int] for arriving at $at during $entry. */
    public function classify(TimetableEntry $entry, Carbon $at): array
    {
        $graceMinutes = (int) config('eeht.late_grace_minutes', 5);
        $start = Carbon::parse($at->toDateString().' '.$entry->start_time);
        $lateMinutes = max(0, (int) floor($start->diffInMinutes($at, false)));

        return $lateMinutes > $graceMinutes
            ? ['status' => 'retard', 'late_minutes' => $lateMinutes]
            : ['status' => 'present', 'late_minutes' => 0];
    }

    /** Single write path for a QR/badge scan (kiosk classroom mode or entry gate). */
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
     * Single write path for a manual/bulk attendance save (admin or teacher
     * portal). Status is always the human-chosen value — a bulk save has no
     * reliable per-student arrival timestamp, so lateness is never inferred
     * here (see AttendanceController::store() for why). The matching
     * TimetableEntry is still linked when one exists, so the ledger can
     * group by session even for manually-entered rows.
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

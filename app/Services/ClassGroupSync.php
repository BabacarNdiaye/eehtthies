<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Tient à jour le groupe EEHT Connect de chaque classe : ses membres sont les
 * élèves actifs de la classe ayant un compte, et les enseignants qui y ont au
 * moins un cours à l'emploi du temps.
 */
class ClassGroupSync
{
    /** @return Collection<int, int> */
    public function memberUserIds(SchoolClass $schoolClass): Collection
    {
        $students = Student::where('school_class_id', $schoolClass->id)
            ->where('status', 'actif')
            ->whereNotNull('user_id')
            ->pluck('user_id');

        $teacherIds = TimetableEntry::where('school_class_id', $schoolClass->id)->distinct()->pluck('teacher_id');
        $teachers = Teacher::whereIn('id', $teacherIds)->whereNotNull('user_id')->pluck('user_id');

        return $students->merge($teachers)->map(fn ($id) => (int) $id)->unique()->values();
    }

    /** @return array<int, int> */
    public function classIdsForUser(User $user): array
    {
        $ids = [];

        $student = $user->student;
        if ($student && $student->status === 'actif' && $student->school_class_id) {
            $ids[] = (int) $student->school_class_id;
        }

        if ($teacher = $user->teacher) {
            $ids = [...$ids, ...TimetableEntry::where('teacher_id', $teacher->id)->distinct()->pluck('school_class_id')->map(fn ($id) => (int) $id)->all()];
        }

        return array_values(array_unique($ids));
    }

    public function syncClass(SchoolClass $schoolClass): Conversation
    {
        $conversation = Conversation::firstOrCreate(
            ['school_class_id' => $schoolClass->id],
            ['type' => Conversation::TYPE_GROUP, 'name' => $schoolClass->name],
        );

        if ($conversation->name !== $schoolClass->name) {
            $conversation->update(['name' => $schoolClass->name]);
        }

        $members = $this->memberUserIds($schoolClass);
        $current = $conversation->participants()->pluck('user_id')->map(fn ($id) => (int) $id);

        $conversation->participants()->whereNotIn('user_id', $members)->delete();

        // Un nouveau membre voit l'historique, mais sans le compter comme non lu.
        $latestId = $conversation->messages()->max('id');
        foreach ($members->diff($current) as $userId) {
            ConversationParticipant::create([
                'conversation_id' => $conversation->id,
                'user_id' => $userId,
                'last_read_message_id' => $latestId,
            ]);
        }

        return $conversation;
    }

    /** Synchronise les groupes de classe de l'utilisateur et le retire de ceux qu'il a quittés. */
    public function syncForUser(User $user): void
    {
        $classIds = $this->classIdsForUser($user);

        SchoolClass::whereIn('id', $classIds)->get()->each(fn (SchoolClass $c) => $this->syncClass($c));

        ConversationParticipant::where('user_id', $user->id)
            ->whereHas('conversation', fn ($q) => $q->whereNotNull('school_class_id')->whereNotIn('school_class_id', $classIds))
            ->delete();
    }
}

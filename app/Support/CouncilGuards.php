<?php

namespace App\Support;

use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\CouncilObservation;
use App\Models\CouncilStudent;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Database\Eloquent\Model;

/**
 * Un conseil de classe (et son procès-verbal) ne disparaît jamais par ricochet : la base refuse de supprimer un élève, une
 * classe ou une année qui y figure (clés RESTRICT). Plutôt qu'une erreur SQL, les écrans de suppression demandent ici
 * pourquoi c'est impossible et l'affichent.
 */
final class CouncilGuards
{
    public static function reason(Model $model): ?string
    {
        $blocked = match (true) {
            $model instanceof Student => CouncilStudent::where('student_id', $model->id)->exists(),
            $model instanceof SchoolClass => Council::where('school_class_id', $model->id)->exists(),
            $model instanceof AcademicYear => Council::where('academic_year_id', $model->id)->exists(),
            $model instanceof Subject => CouncilObservation::where('subject_id', $model->id)->exists(),
            $model instanceof Formation => Council::whereHas('schoolClass', fn ($query) => $query->where('formation_id', $model->id))->exists(),
            default => false,
        };

        if (! $blocked) {
            return null;
        }

        return match (true) {
            $model instanceof Student => 'Cet élève figure dans un conseil de classe : son dossier ne peut pas être supprimé. Changez plutôt son statut (abandon, transféré…).',
            $model instanceof SchoolClass => 'Cette classe a déjà un conseil de classe : elle ne peut pas être supprimée.',
            $model instanceof AcademicYear => 'Cette année a déjà des conseils de classe : elle ne peut pas être supprimée.',
            $model instanceof Subject => 'Cette matière a déjà été appréciée dans un conseil de classe : elle ne peut pas être supprimée.',
            default => 'Une classe de cette formation a déjà un conseil de classe : la formation ne peut pas être supprimée.',
        };
    }
}

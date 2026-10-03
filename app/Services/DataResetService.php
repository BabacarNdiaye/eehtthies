<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Support\DatabaseBackup;
use App\Support\DataResetCatalog;
use App\Support\DataResetException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Exécute les réinitialisations choisies dans Paramètres › Réinitialiser des données (voir DataResetCatalog).
 *
 * Déroulement : sauvegarde de la base (un échec arrête tout avant la moindre suppression) → une seule transaction qui vide les
 * tables en requêtes brutes (aucun événement Eloquent : ni milliers d'entrées d'activité, ni annulations
 * comptables en chaîne) → seulement après validation de la transaction, suppression des fichiers et des
 * médias, rechargement des contenus d'origine et journalisation. Un échec avant la fin de la transaction
 * annule tout et laisse les fichiers intacts.
 */
class DataResetService
{
    /** @var array<string, true>|null tables existantes, lues une seule fois par instance */
    private ?array $existingTables = null;

    public function __construct(private readonly DatabaseBackup $backup) {}

    /**
     * Catalogue regroupé pour l'écran, avec le nombre d'enregistrements par table et les dépendances.
     *
     * @return list<array{label: string, categories: list<array<string, mixed>>}>
     */
    public function overview(User $actor): array
    {
        $groups = [];

        foreach (DataResetCatalog::all() as $key => $category) {
            $counts = $this->counts($key, $category, $actor);

            $groups[$category['group']]['label'] = $category['group'];
            $groups[$category['group']]['categories'][] = [
                'key' => $key,
                'label' => $category['label'],
                'description' => $category['description'],
                'note' => $category['note'],
                'counts' => $counts,
                'count' => array_sum($counts),
                'includes' => DataResetCatalog::includes($key),
                'restore' => $category['restore'] === null ? null : ($category['restore_forced'] ? 'forced' : 'optional'),
            ];
        }

        return array_values($groups);
    }

    /**
     * @param  list<string>  $keys  catégories choisies (leurs dépendances sont ajoutées)
     * @param  list<string>  $restore  catégories dont l'administrateur veut recharger le contenu d'origine
     * @return array{categories: list<string>, rows: int, files: int, restored: list<string>, warnings: list<string>}
     *
     * @throws DataResetException avant toute suppression (sauvegarde impossible) ou après annulation complète
     */
    public function run(array $keys, array $restore, User $actor): array
    {
        $ordered = DataResetCatalog::closure($keys);

        // Avant la sauvegarde, qui peut être longue : la limite d'un hébergement mutualisé court sur toute la requête.
        if (function_exists('set_time_limit')) {
            set_time_limit(300);
        }

        if (! $this->backup->run()) {
            throw new DataResetException("La sauvegarde automatique de la base a échoué : rien n'a été supprimé. Consultez la page Sauvegardes, puis réessayez.");
        }

        $trash = ['files' => [], 'media' => []];
        $rows = 0;

        try {
            DB::transaction(function () use ($ordered, $actor, &$trash, &$rows) {
                foreach ($ordered as $key) {
                    $rows += $this->purge(DataResetCatalog::find($key), $actor, $trash);
                }
            });
        } catch (Throwable $e) {
            report($e);

            throw new DataResetException("La réinitialisation a échoué. Aucune donnée n'a été supprimée.", 0, $e);
        }

        // À partir d'ici les données sont supprimées : plus rien ne doit lever d'exception.
        $warnings = [];
        $files = $this->deleteFiles($trash['files'], $warnings);
        $this->deleteMedia(array_keys($trash['media']), $warnings);
        $this->forgetSettings($ordered);
        $restored = $this->restore($ordered, $restore, $warnings);
        $this->log($actor, $ordered, $rows, $files, $restored);

        return ['categories' => $ordered, 'rows' => $rows, 'files' => $files, 'restored' => $restored, 'warnings' => $warnings];
    }

    /** @return array<string, int> nombre de lignes par table (clés pseudo-table pour les réglages et les comptes) */
    private function counts(string $key, array $category, User $actor): array
    {
        $counts = [];

        foreach ($category['tables'] as $table) {
            $counts[$table] = $this->tableExists($table) ? DB::table($table)->count() : 0;
        }

        if ($category['settings'] !== []) {
            $counts["settings:{$key}"] = DB::table('settings')->whereIn('key', $category['settings'])->count();
        }

        if ($category['scope'] === 'portal_users') {
            $counts['users:portail'] = $this->portalUserIds($actor)->count();
        }

        return $counts;
    }

    /**
     * Vide une catégorie dans la transaction en cours et note ce qu'il faudra effacer après validation.
     *
     * @param  array{files: array<string, array<string, true>>, media: array<string, true>}  $trash
     * @return int nombre de lignes supprimées
     */
    private function purge(array $category, User $actor, array &$trash): int
    {
        $rows = 0;

        // Chemins lus avant la suppression des lignes qui les portent.
        foreach ($category['files'] as [$table, $column, $disks]) {
            if ($this->tableExists($table) && Schema::hasColumn($table, $column)) {
                $this->collectPaths($trash['files'], $disks, DB::table($table)->whereNotNull($column)->pluck($column));
            }
        }

        foreach ($category['morphs'] as $class) {
            $rows += $this->purgeMorphDependents($class, $trash);
        }

        foreach ($category['tables'] as $table) {
            if ($this->tableExists($table)) {
                $rows += DB::table($table)->delete();
            }
        }

        if ($category['settings'] !== []) {
            $this->collectPaths($trash['files'], ['public'], DB::table('settings')->whereIn('key', $category['setting_files'])->pluck('value'));
            $rows += DB::table('settings')->whereIn('key', $category['settings'])->delete();
        }

        if ($category['scope'] === 'portal_users') {
            $rows += $this->purgePortalUsers($actor, $trash);
        }

        return $rows;
    }

    /** Dépendants polymorphes d'un modèle, sans clé étrangère : écritures automatiques, pièces jointes, médias. */
    private function purgeMorphDependents(string $class, array &$trash): int
    {
        $rows = 0;

        if ($this->tableExists('journal_entries')) {
            // Les lignes d'écriture partent en cascade avec l'écriture.
            $rows += DB::table('journal_entries')->where('entryable_type', $class)->delete();
        }

        if ($this->tableExists('attachments')) {
            $this->collectPaths($trash['files'], [Attachment::DISK], DB::table('attachments')->where('attachable_type', $class)->pluck('file_path'));
            $rows += DB::table('attachments')->where('attachable_type', $class)->delete();
        }

        $trash['media'][$class] = true;

        return $rows;
    }

    /** Supprime les comptes dont tous les rôles sont ceux du portail (jamais le personnel ni l'acteur). */
    private function purgePortalUsers(User $actor, array &$trash): int
    {
        $morph = (new User)->getMorphClass();
        $morphKey = config('permission.column_names.model_morph_key', 'model_id');
        $rows = 0;

        foreach ($this->portalUserIds($actor)->chunk(500) as $chunk) {
            $ids = $chunk->values()->all();

            // La demande de congé disparaît en cascade avec le compte : ses pièces jointes (sans clé étrangère) d'abord.
            if ($this->tableExists('leave_requests') && $this->tableExists('attachments')) {
                foreach (array_chunk(DB::table('leave_requests')->whereIn('user_id', $ids)->pluck('id')->all(), 500) as $leaveIds) {
                    $this->collectPaths($trash['files'], [Attachment::DISK], DB::table('attachments')->where('attachable_type', LeaveRequest::class)->whereIn('attachable_id', $leaveIds)->pluck('file_path'));
                    $rows += DB::table('attachments')->where('attachable_type', LeaveRequest::class)->whereIn('attachable_id', $leaveIds)->delete();
                }
            }

            $this->collectPaths($trash['files'], ['public'], DB::table('users')->whereIn('id', $ids)->whereNotNull('avatar')->pluck('avatar'));

            foreach (['model_has_roles', 'model_has_permissions'] as $pivot) {
                DB::table(config("permission.table_names.{$pivot}"))->where('model_type', $morph)->whereIn($morphKey, $ids)->delete();
            }

            if ($this->tableExists('sessions')) {
                DB::table('sessions')->whereIn('user_id', $ids)->delete();
            }

            $push = config('webpush.table_name', 'push_subscriptions');

            if ($this->tableExists($push)) {
                DB::table($push)->where('subscribable_type', $morph)->whereIn('subscribable_id', $ids)->delete();
            }

            $rows += DB::table('users')->whereIn('id', $ids)->delete();
        }

        return $rows;
    }

    /**
     * Le code peut être en ligne avant la migration qui crée une table (elle passe par un cron ponctuel) :
     * une table absente n'a rien à supprimer, elle ne doit pas rendre la réinitialisation inutilisable.
     */
    private function tableExists(string $table): bool
    {
        $this->existingTables ??= array_fill_keys(Schema::getTableListing(schemaQualified: false), true);

        return isset($this->existingTables[$table]);
    }

    /** @return Collection<int, int> */
    private function portalUserIds(User $actor): Collection
    {
        return User::query()
            ->whereKeyNot($actor->getKey())
            ->whereHas('roles', fn ($query) => $query->whereIn('name', DataResetCatalog::PORTAL_ROLES))
            ->whereDoesntHave('roles', fn ($query) => $query->whereNotIn('name', DataResetCatalog::PORTAL_ROLES))
            ->pluck('id');
    }

    /** Retient les chemins à effacer (liens externes et valeurs vides ignorés), sans doublon, par disque. */
    private function collectPaths(array &$files, array $disks, iterable $paths): void
    {
        foreach ($paths as $path) {
            $path = trim((string) $path);

            if ($path === '' || str_starts_with($path, 'http')) {
                continue; // vide, ou lien externe (p. ex. vidéo de galerie hébergée ailleurs)
            }

            foreach ($disks as $disk) {
                $files[$disk][$path] = true;
            }
        }
    }

    /** @param  array<string, array<string, true>>  $files */
    private function deleteFiles(array $files, array &$warnings): int
    {
        $deleted = 0;

        foreach ($files as $diskName => $paths) {
            $disk = Storage::disk($diskName);

            foreach (array_keys($paths) as $path) {
                try {
                    if ($disk->exists($path) && $disk->delete($path)) {
                        $deleted++;
                    }
                } catch (Throwable $e) {
                    report($e);
                    $warnings[] = "Fichier non supprimé : {$path}";
                }
            }
        }

        return $deleted;
    }

    /** Supprime les médias des modèles vidés par le modèle Eloquent, dont l'observateur retire aussi les fichiers. */
    private function deleteMedia(array $classes, array &$warnings): void
    {
        if ($classes === [] || ! $this->tableExists('media')) {
            return;
        }

        try {
            Media::query()->whereIn('model_type', $classes)->chunkById(100, fn ($medias) => $medias->each->delete());
        } catch (Throwable $e) {
            report($e);
            $warnings[] = "Certains documents joints n'ont pas pu être supprimés du disque.";
        }
    }

    /** Efface du cache les réglages remis à zéro, sinon le site afficherait encore l'ancienne valeur. */
    private function forgetSettings(array $ordered): void
    {
        foreach ($ordered as $key) {
            foreach (DataResetCatalog::find($key)['settings'] as $settingKey) {
                Cache::forget("setting:{$settingKey}");
            }
        }
    }

    /**
     * @param  list<string>  $ordered
     * @param  list<string>  $restore
     * @return list<string> catégories dont le contenu d'origine a été rechargé
     */
    private function restore(array $ordered, array $restore, array &$warnings): array
    {
        $restored = [];

        foreach ($ordered as $key) {
            $category = DataResetCatalog::find($key);

            if ($category['restore'] === null || (! $category['restore_forced'] && ! in_array($key, $restore, true))) {
                continue;
            }

            try {
                app($category['restore'])->run();
                $restored[] = $key;
            } catch (Throwable $e) {
                report($e);
                $warnings[] = "Le contenu d'origine de « {$category['label']} » n'a pas pu être rechargé.";
            }
        }

        return $restored;
    }

    /** Écrit la trace après la purge, pour qu'elle subsiste même si le journal d'activité vient d'être vidé. */
    private function log(User $actor, array $categories, int $rows, int $files, array $restored): void
    {
        try {
            activity('administration')
                ->causedBy($actor)
                ->withProperties(['categories' => $categories, 'rows' => $rows, 'files' => $files, 'restored' => $restored])
                ->log('Réinitialisation de données');
        } catch (Throwable $e) {
            report($e);
        }
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Backup\BackupDestination\BackupDestination;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    private function destinations(): array
    {
        $name = config('backup.backup.name');

        return collect(config('backup.backup.destination.disks'))
            ->map(fn ($disk) => BackupDestination::create($disk, $name))
            ->all();
    }

    /** Retrouve l'objet Backup correspondant à un disque et un chemin relatif donnés, ou interrompt la requête. */
    private function findBackup(string $disk, string $path)
    {
        $destination = collect($this->destinations())->firstWhere(fn ($d) => $d->diskName() === $disk);
        abort_unless($destination, 404);

        $backup = $destination->backups()->first(fn ($b) => $b->path() === $path);
        abort_unless($backup, 404);

        return $backup;
    }

    public function index(): Response
    {
        $backups = collect($this->destinations())
            ->flatMap(fn (BackupDestination $destination) => $destination->backups()->map(fn ($backup) => [
                'disk' => $destination->diskName(),
                'path' => $backup->path(),
                'name' => basename($backup->path()),
                'date' => $backup->date()->toDateTimeString(),
                'size' => $backup->sizeInBytes(),
            ]))
            ->sortByDesc('date')
            ->values();

        $healthy = true;
        $error = null;

        try {
            Artisan::call('backup:monitor');
        } catch (\Throwable $e) {
            $healthy = false;
            $error = $e->getMessage();
        }

        return Inertia::render('Admin/Backups/Index', [
            'backups' => $backups,
            'healthy' => $healthy,
            'error' => $error,
            'totalSize' => $backups->sum('size'),
        ]);
    }

    public function store(Request $request)
    {
        Artisan::call('backup:run', ['--only-db' => $request->boolean('only_db')]);

        return back()->with('success', 'Sauvegarde créée avec succès.');
    }

    public function download(Request $request): StreamedResponse
    {
        $data = $request->validate(['disk' => ['required', 'string'], 'path' => ['required', 'string']]);
        $backup = $this->findBackup($data['disk'], $data['path']);

        return response()->streamDownload(function () use ($backup) {
            fpassthru($backup->stream());
        }, basename($backup->path()));
    }

    public function destroy(Request $request)
    {
        $data = $request->validate(['disk' => ['required', 'string'], 'path' => ['required', 'string']]);
        $backup = $this->findBackup($data['disk'], $data['path']);
        $backup->delete();

        return back()->with('success', 'Sauvegarde supprimée.');
    }
}

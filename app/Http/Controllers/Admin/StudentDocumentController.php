<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentDocumentController extends Controller
{
    public function store(Request $request, Student $student)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'in:'.implode(',', array_keys(StudentDocument::TYPES))],
            'title' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        // Pièces d'identité, certificats… : disque PRIVÉ (storage/app/private), jamais servi directement par le web ;
        // elles s'ouvrent par la route students.documents.show, qui vérifie les droits de la personne connectée.
        $path = $request->file('file')->store('student-documents/'.$student->id, 'local');

        $student->documents()->create([
            'type' => $data['type'],
            'title' => $data['title'],
            'file_path' => $path,
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Document ajouté avec succès.');
    }

    public function destroy(Student $student, StudentDocument $document)
    {
        abort_unless($document->student_id === $student->id, 404);

        // Le fichier peut encore être sur l'ancien disque public (avant son déplacement) : on nettoie les deux.
        foreach (['local', 'public'] as $disk) {
            Storage::disk($disk)->delete($document->file_path);
        }
        $document->delete();

        return back()->with('success', 'Document supprimé.');
    }

    /**
     * Ouvre un document d'élève : réservé à qui a le droit de voir les élèves (voir la route). Un fichier encore
     * sur l'ancien disque public est ramené sur le disque privé à sa première ouverture.
     */
    public function show(Student $student, StudentDocument $document)
    {
        abort_unless($document->student_id === $student->id, 404);

        $disk = $document->privatize() ?? abort(404, 'Fichier introuvable.');

        return Storage::disk($disk)->response($document->file_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}

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

        $path = $request->file('file')->store('student-documents/'.$student->id, 'public');

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

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return back()->with('success', 'Document supprimé.');
    }
}

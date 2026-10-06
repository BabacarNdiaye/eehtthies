<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Support\AttachmentTargets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AttachmentController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'target' => ['required', Rule::in(AttachmentTargets::aliases())],
            'target_id' => ['required', 'integer'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx', 'max:5120'],
        ]);

        $target = AttachmentTargets::find($data['target'], (int) $data['target_id']);
        abort_if($target === null, 404);
        abort_unless(AttachmentTargets::canManage($request->user(), $target), 403);

        $file = $request->file('file');

        $target->attachments()->create([
            'original_name' => $file->getClientOriginalName(),
            'file_path' => $file->store("attachments/{$data['target']}/{$target->getKey()}", Attachment::DISK),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Document importé avec succès.');
    }

    public function download(Request $request, Attachment $attachment)
    {
        abort_unless($attachment->attachable && AttachmentTargets::canView($request->user(), $attachment->attachable), 403);

        return Storage::disk(Attachment::DISK)->download($attachment->file_path, $attachment->original_name);
    }

    public function destroy(Request $request, Attachment $attachment)
    {
        abort_unless($attachment->attachable && AttachmentTargets::canManage($request->user(), $attachment->attachable), 403);

        $attachment->delete();

        return back()->with('success', 'Document supprimé.');
    }
}

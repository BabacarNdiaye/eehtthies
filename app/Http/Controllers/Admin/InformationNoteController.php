<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Formation;
use App\Models\InformationNote;
use App\Models\SchoolClass;
use App\Support\HtmlSanitizer;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InformationNoteController extends Controller
{
    /** Audiences proposées pour une note d'information (les cibles plus fines restent réservées aux annonces). */
    private const AUDIENCES = ['enseignants', 'eleves', 'parents', 'administration', 'ecole', 'formation', 'classe'];

    public function index(): Response
    {
        $year = (int) now()->year;

        return Inertia::render('Admin/InformationNotes/Index', [
            'notes' => InformationNote::with('createdBy:id,name')->orderByDesc('year')->orderByDesc('number')->paginate(15)
                ->through(fn (InformationNote $n) => [
                    'id' => $n->id,
                    'reference' => $n->reference,
                    'note_date' => $n->note_date->toDateString(),
                    'subject' => $n->subject,
                    'audience' => $n->audience_label,
                    'recipients_count' => $n->announcement?->recipients_count ?? 0,
                    'emails_count' => $n->emails_count,
                    'created_by' => $n->createdBy?->name,
                ]),
            'nextReference' => str_pad((string) InformationNote::nextNumber($year), 6, '0', STR_PAD_LEFT).'.'.InformationNote::REFERENCE_SUFFIX,
            'yearCount' => InformationNote::where('year', $year)->count(),
            'today' => now()->toDateString(),
            'audienceTypes' => collect(self::AUDIENCES)->mapWithKeys(fn ($k) => [$k => Announcement::AUDIENCE_TYPES[$k]]),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'note_date' => ['required', 'date'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:20000'],
            'audience_type' => ['required', Rule::in(self::AUDIENCES)],
            'audience_id' => ['nullable', 'integer', 'required_if:audience_type,formation,classe'],
            'send_email' => ['boolean'],
        ]);
        if (HtmlSanitizer::toText(HtmlSanitizer::clean($data['body'])) === '') {
            throw ValidationException::withMessages(['body' => 'Le contenu de la note est obligatoire.']);
        }
        $sendEmail = (bool) ($data['send_email'] ?? false);
        unset($data['send_email']);

        $note = InformationNote::issue($data, $request->user()->id);

        $message = "Note d'information N° {$note->reference} envoyée à {$note->announcement->recipients_count} destinataire(s).";
        if ($sendEmail) {
            $message .= ' '.$note->sendByEmail().' e-mail(s) avec le PDF en pièce jointe en cours d\'envoi.';
        }

        return back()->with('success', $message);
    }

    public function pdf(InformationNote $informationNote)
    {
        return response($informationNote->pdfContent(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="note-information-'.str_pad((string) $informationNote->number, 6, '0', STR_PAD_LEFT).'.pdf"',
        ]);
    }
}

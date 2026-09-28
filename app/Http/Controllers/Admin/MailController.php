<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\GenericMessage;
use App\Models\InternalMessage;
use App\Models\SentEmail;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class MailController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Mail/Index', [
            // The messaging module always addresses actors by their professional
            // (institutional) e-mail, never their personal one — it's the address
            // tied to their portal login, so this is what actually reaches them.
            'students' => Student::whereNotNull('professional_email')->where('professional_email', '!=', '')
                ->with('schoolClass:id,name')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'professional_email as email', 'school_class_id', 'user_id']),
            'teachers' => Teacher::whereNotNull('professional_email')->where('professional_email', '!=', '')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'professional_email as email', 'specialty', 'user_id']),
            'history' => SentEmail::with('sender:id,name')->latest()->paginate(15),
        ]);
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'recipients' => ['required', 'array', 'min:1'],
            'recipients.*.email' => ['required', 'email'],
            'recipients.*.name' => ['nullable', 'string'],
        ]);

        $internalCount = 0;
        $emailCount = 0;

        foreach ($data['recipients'] as $recipient) {
            $user = User::where('email', $recipient['email'])->first();

            if ($user) {
                // Has a portal account (élève/enseignant/parent) — deliver as an
                // internal message they'll see (with a notification) in their space.
                InternalMessage::create([
                    'sender_id' => $request->user()->id,
                    'recipient_id' => $user->id,
                    'subject' => $data['subject'],
                    'body' => $data['body'],
                ]);
                $internalCount++;
            } else {
                // No portal account (e.g. a parent/partner e-mail typed manually) —
                // fall back to a real e-mail. GenericMessage implements ShouldQueue,
                // so this is dispatched to the queue rather than sent synchronously.
                Mail::to($recipient['email'])->send(
                    new GenericMessage($data['subject'], $data['body'], $recipient['name'] ?? null)
                );
                $emailCount++;
            }
        }

        SentEmail::create([
            'sender_id' => $request->user()->id,
            'subject' => $data['subject'],
            'body' => $data['body'],
            'recipients' => $data['recipients'],
            'recipients_count' => count($data['recipients']),
        ]);

        $parts = [];
        if ($internalCount) {
            $parts[] = "{$internalCount} message(s) interne(s) envoyé(s)";
        }
        if ($emailCount) {
            $parts[] = "{$emailCount} e-mail(s) en cours d'envoi";
        }

        return back()->with('success', implode(' et ', $parts).'.');
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\GenericMessage;
use App\Models\SentEmail;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\Messenger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class MailController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Mail/Index', [
            // Le module de messagerie s'adresse toujours aux acteurs par leur e-mail professionnel
            // (institutionnel), jamais par leur e-mail personnel — c'est l'adresse liée à leur connexion au
            // portail, donc celle qui les atteint réellement.
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

    public function send(Request $request, Messenger $messenger)
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
                // Possède un compte portail (élève/enseignant/parent) — livré dans sa conversation privée
                // EEHT Connect (avec une notification push).
                $messenger->send(
                    $messenger->directConversation($request->user(), $user),
                    $request->user(),
                    $data['body'],
                    subject: $data['subject'],
                );
                $internalCount++;
            } else {
                // Pas de compte portail (p. ex. un e-mail de parent ou de partenaire saisi à la main) — on se
                // rabat sur un e-mail réel. GenericMessage implémente ShouldQueue : l'envoi est donc placé
                // dans la file plutôt qu'effectué de manière synchrone.
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

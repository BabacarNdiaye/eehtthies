<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Mail\InformationNoteMail;
use App\Support\HtmlSanitizer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * Note d'information officielle de la Direction : numérotée (N° 000026.MEFPA/EEHT/DIR), datée, avec objet et
 * contenu, imprimable sur le papier à en-tête de l'école et diffusée aux destinataires via une Announcement.
 */
class InformationNote extends Model
{
    public const REFERENCE_SUFFIX = 'MEFPA/EEHT/DIR';

    protected $fillable = [
        'year', 'number', 'note_date', 'subject', 'body', 'audience_type', 'audience_id', 'announcement_id', 'emails_count', 'created_by',
    ];

    protected $casts = [
        'note_date' => 'date',
    ];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Prochain numéro de l'année (la numérotation repart de 1 chaque année civile). */
    public static function nextNumber(int $year): int
    {
        return (int) self::where('year', $year)->max('number') + 1;
    }

    /** Crée la note avec un numéro attribué sous verrou, puis la diffuse. */
    public static function issue(array $data, int $createdBy): self
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $year = (int) date('Y', strtotime($data['note_date']));
            $data['body'] = HtmlSanitizer::clean($data['body']);
            // Les annonces s'affichent sans mise en forme dans les portails : on leur donne la version texte.
            $announcement = Announcement::broadcast([
                'title' => $data['subject'],
                'body' => HtmlSanitizer::toText($data['body']),
                'priority' => 'importante',
                'audience_type' => $data['audience_type'],
                'audience_id' => $data['audience_id'] ?? null,
            ], $createdBy);

            // L'index unique (year, number) garantit qu'aucun numéro n'est attribué deux fois.
            return self::create([
                ...$data,
                'year' => $year,
                'number' => self::nextNumber($year),
                'announcement_id' => $announcement->id,
                'created_by' => $createdBy,
            ]);
        });
    }

    public function getReferenceAttribute(): string
    {
        return str_pad((string) $this->number, 6, '0', STR_PAD_LEFT).'.'.self::REFERENCE_SUFFIX;
    }

    /** Contenu prêt à afficher : le HTML de l'éditeur, ou le texte brut des notes saisies avant son arrivée. */
    public function getBodyHtmlAttribute(): string
    {
        return $this->body === strip_tags($this->body) ? nl2br(e($this->body)) : $this->body;
    }

    public function getAudienceLabelAttribute(): string
    {
        return Announcement::AUDIENCE_TYPES[$this->audience_type] ?? $this->audience_type;
    }

    /**
     * PDF de la note sur papier à en-tête. Une note envoyée n'est jamais modifiée : le PDF est donc généré une
     * seule fois puis relu depuis le disque (utile quand il est joint à des centaines d'e-mails).
     */
    public function pdfContent(): string
    {
        $path = "information-notes/{$this->id}.pdf";

        if (! Storage::disk('local')->exists($path)) {
            Storage::disk('local')->put($path, Pdf::loadView('pdf.information-note', ['note' => $this])->setPaper('a4')->output());
        }

        return Storage::disk('local')->get($path);
    }

    /** Adresses réelles des destinataires : e-mails des comptes (professionnel et personnel) + tuteurs sans compte. */
    public function recipientEmails(): Collection
    {
        $userIds = $this->announcement?->recipients()->pluck('users.id') ?? collect();

        $emails = User::whereIn('id', $userIds)->get(['email', 'personal_email'])
            ->flatMap(fn (User $u) => [$u->email, $u->personal_email]);

        if (in_array($this->audience_type, ['parents', 'ecole'], true)) {
            $emails = $emails->merge(
                Student::where('status', 'actif')->whereNull('parent_user_id')->whereNotNull('guardian_email')->pluck('guardian_email')
            );
        }

        return $emails->filter(fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL))
            ->map(fn ($e) => strtolower($e))->unique()->values();
    }

    /** Envoie la note (PDF en pièce jointe) par e-mail ; les envois passent par la file d'attente. */
    public function sendByEmail(): int
    {
        $this->pdfContent();
        $emails = $this->recipientEmails();

        foreach ($emails as $email) {
            Mail::to($email)->send(new InformationNoteMail($this));
        }

        $this->update(['emails_count' => $emails->count()]);

        return $emails->count();
    }
}

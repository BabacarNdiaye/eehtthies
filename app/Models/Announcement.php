<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Announcement extends Model
{
    public const PRIORITIES = [
        'normale' => 'Normale',
        'importante' => 'Importante',
        'urgente' => 'Urgente',
    ];

    public const AUDIENCE_TYPES = [
        'ecole' => 'Toute l\'école',
        'eleves' => 'Ensemble des élèves',
        'parents' => 'Les parents',
        'formation' => 'Une formation',
        'classe' => 'Une classe',
        'enseignants' => 'Les enseignants',
        'administration' => 'Personnel administratif',
    ];

    protected $fillable = ['title', 'body', 'priority', 'audience_type', 'audience_id', 'recipients_count', 'created_by'];

    /**
     * Crée l'annonce et la remet à ses destinataires en base. Les notifications push partent en différé via
     * app:push-pending-messages (pushed_at null) pour ne pas bloquer la requête sur des centaines d'appels HTTP.
     */
    public static function broadcast(array $data, int $createdBy): self
    {
        $announcement = self::create([...$data, 'created_by' => $createdBy]);
        // L'auteur ne reçoit ni la notification, ni l'e-mail de son propre envoi, même s'il fait partie du public visé.
        $recipientIds = $announcement->recipientUserIds()->reject(fn ($id) => (int) $id === $createdBy)->values();

        $now = now();
        $recipientIds->chunk(500)->each(fn ($chunk) => DB::table('announcement_user')->insertOrIgnore(
            $chunk->map(fn (int $userId) => [
                'announcement_id' => $announcement->id,
                'user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all()
        ));

        $announcement->update(['recipients_count' => $recipientIds->count()]);

        return $announcement;
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Destinataires à qui l'annonce a été remise (avec leur état de lecture). */
    public function recipients()
    {
        return $this->belongsToMany(User::class, 'announcement_user')
            ->withPivot(['read_at', 'pushed_at'])
            ->withTimestamps();
    }

    /**
     * Détermine les identifiants des utilisateurs réellement destinataires de cette annonce selon son
     * audience. Le calcul est refait à chaque appel plutôt que stocké, afin de refléter toujours qui est
     * actuellement actif, inscrit ou en poste.
     */
    public function recipientUserIds(): Collection
    {
        return match ($this->audience_type) {
            'ecole' => Student::where('status', 'actif')->whereNotNull('user_id')->pluck('user_id')
                ->merge(Student::where('status', 'actif')->whereNotNull('parent_user_id')->pluck('parent_user_id'))
                ->merge(Teacher::whereNotNull('user_id')->pluck('user_id'))
                ->merge(User::adminStaff()->pluck('id'))
                ->unique()->values(),
            'eleves' => Student::where('status', 'actif')->whereNotNull('user_id')->pluck('user_id')->unique()->values(),
            'parents' => Student::where('status', 'actif')->whereNotNull('parent_user_id')->pluck('parent_user_id')->unique()->values(),
            'formation' => Student::where('status', 'actif')->where('formation_id', $this->audience_id)->whereNotNull('user_id')->pluck('user_id'),
            'classe' => Student::where('status', 'actif')->where('school_class_id', $this->audience_id)->whereNotNull('user_id')->pluck('user_id'),
            'enseignants' => Teacher::whereNotNull('user_id')->pluck('user_id'),
            'administration' => User::adminStaff()->pluck('id'),
            default => collect(),
        };
    }
}

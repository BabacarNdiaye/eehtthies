<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Comment joindre la famille d'un élève : l'adresse e-mail (parent, puis tuteur, puis élève), les comptes qui reçoivent
 * une notification (parent, puis élève) et le dépôt d'un message dans EEHT Connect. Partagé par les reçus de paiement
 * et par les relances.
 */
class FamilyChannels
{
    /**
     * Ce dont la famille dispose pour être avertie (annoncé à l'opérateur avant tout envoi).
     *
     * @return array{mail: bool, push: bool, connect: bool}
     */
    public function available(Student $student): array
    {
        $hasAccount = $this->accounts($student)->isNotEmpty();

        return ['mail' => $this->mailAddress($student) !== null, 'push' => $hasAccount, 'connect' => $hasAccount];
    }

    public function canReach(Student $student): bool
    {
        return in_array(true, $this->available($student), true);
    }

    /** Comptes de la famille qui peuvent recevoir une notification : le parent, puis l'élève. */
    public function accounts(Student $student): Collection
    {
        return collect([$student->parentUser, $student->user])->filter()->unique('id')->values();
    }

    public function mailAddress(Student $student): ?string
    {
        return collect([$student->parentUser?->email, $student->guardian_email, $student->email])
            ->first(fn ($email) => filled($email));
    }

    public function recipientName(Student $student): ?string
    {
        return $student->parentUser?->name ?? $student->guardian_name ?? $student->full_name;
    }

    /** Lien (relatif) vers les factures de l'élève, selon le compte qui reçoit : l'onglet « Factures » du parent, ou l'espace de l'élève. */
    public function invoicesUrl(User $user, Student $student): string
    {
        return $student->parent_user_id === $user->id
            ? route('parent.child', ['student' => $student, 'tab' => 'factures'], false)
            : route('student.invoices', [], false);
    }

    /** Dépose un message système dans EEHT Connect ; `false` si cela échoue (l'erreur est journalisée, jamais levée). */
    public function postToConnect(User $user, string $body, array $meta): bool
    {
        try {
            $messenger = app(Messenger::class);
            // Le push part déjà par SafePush : le message Connect ne doit pas en déclencher un second.
            $messenger->sendSystem($messenger->assistantConversation($user), $body, $meta, push: false);

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}

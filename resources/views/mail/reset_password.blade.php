@extends('mail.layout')

@section('title', 'Réinitialisation de votre mot de passe')
@section('eyebrow', 'Sécurité du compte')

@section('content')
    <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour{{ $recipientName ? ' '.$recipientName : '' }},</p>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Vous recevez cet e-mail car une demande de réinitialisation de mot de passe a été effectuée pour votre compte.
    </p>

    <a href="{{ $url }}" style="display:inline-block; background-color:#0b1728; color:#ffffff; text-decoration:none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Réinitialiser mon mot de passe
    </a>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Ce lien expirera dans {{ $expireMinutes }} minutes.
        Si vous n'êtes pas à l'origine de cette demande, aucune action n'est requise —
        votre mot de passe restera inchangé.
    </p>

    <p style="margin: 20px 0 0; font-size: 12px; color: #7c8ea3; word-break: break-all;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="{{ $url }}" style="color:#0b1728;">{{ $url }}</a>
    </p>
@endsection

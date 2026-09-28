@extends('mail.layout')

@section('title', 'Bienvenue à ' . \App\Models\Setting::get('site_name', 'EEHT de Thiès'))
@section('eyebrow', 'Espace élève')

@section('content')
    <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $student->first_name }},</p>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Bienvenue à {{ \App\Models\Setting::get('site_name', 'EEHT de Thiès') }} ! Votre espace élève en ligne est
        maintenant prêt. Vous y retrouverez votre emploi du temps, vos notes et bulletins, vos présences,
        vos factures, ainsi que votre carte d'étudiant avec QR code à présenter à l'entrée de l'établissement.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb; border: 1px solid #eef1f4; border-radius: 10px; margin: 0 0 24px;">
        <tr>
            <td style="padding: 18px 20px;">
                <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #7c8ea3;">Identifiant</p>
                <p style="margin: 0 0 14px; font-size: 15px; font-weight: 600; color: #0b1728;">{{ $student->professional_email }}</p>
                <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #7c8ea3;">Mot de passe provisoire</p>
                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0b1728;">{{ $password }}</p>
            </td>
        </tr>
    </table>

    <a href="{{ $loginUrl }}" style="display:inline-block; background-color:#0b1728; color:#ffffff; text-decoration:none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Accéder à mon espace élève
    </a>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Pour un accès plus rapide depuis votre téléphone, ouvrez ce lien dans votre navigateur puis choisissez
        <strong>« Ajouter à l'écran d'accueil »</strong> (ou acceptez la proposition d'installation qui s'affiche) —
        l'espace élève s'utilise alors comme une application, sans passer par le navigateur.
    </p>

    <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Pour votre sécurité, nous vous recommandons de changer ce mot de passe dès votre première connexion,
        depuis la page « Mot de passe » de votre espace.
    </p>

    <p style="margin: 20px 0 0; font-size: 12px; color: #7c8ea3; word-break: break-all;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="{{ $loginUrl }}" style="color:#0b1728;">{{ $loginUrl }}</a>
    </p>
@endsection

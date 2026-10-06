@extends('mail.layout')

@section('title', 'Bulletin de paie disponible — '.$periodLabel)
@section('eyebrow', 'Paie · Bulletin disponible')

@section('content')
    <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $name }},</p>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Votre salaire pour <strong>{{ mb_strtolower($periodLabel) }}</strong> a été versé. Votre bulletin de paie est disponible dans
        la rubrique « Ma paie » de votre espace : vous pouvez le consulter et le télécharger en PDF après vous être connecté(e).
    </p>

    <p style="margin: 0 0 24px; text-align: center;">
        <a href="{{ $url }}" style="display: inline-block; padding: 12px 24px; background-color: #0b1728; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">Ouvrir « Ma paie »</a>
    </p>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Pour votre sécurité, ce message ne contient ni montant ni numéro de compte. En cas d'erreur sur votre bulletin, contactez le service de comptabilité.
    </p>
@endsection

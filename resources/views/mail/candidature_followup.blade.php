@extends('mail.layout')

@section('title', $candidature->status === 'dossier_incomplet' ? 'Dossier incomplet' : 'Candidature en attente')
@section('eyebrow', 'Admissions · Suivi de candidature')

@section('content')
    <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $candidature->first_name }},</p>

    @if($candidature->status === 'dossier_incomplet')
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
            Votre candidature pour la formation <strong>{{ $candidature->formation->name ?? '—' }}</strong>
            (référence <strong>{{ $candidature->reference }}</strong>) est actuellement marquée comme
            <strong>dossier incomplet</strong>. Merci de compléter les pièces manquantes dès que possible
            afin que nous puissions poursuivre l'étude de votre dossier.
        </p>
    @else
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
            Vous avez commencé une candidature pour la formation
            <strong>{{ $candidature->formation->name ?? '—' }}</strong>
            (référence <strong>{{ $candidature->reference }}</strong>) mais ne l'avez pas encore soumise.
            N'hésitez pas à la finaliser pour que nous puissions l'étudier.
        </p>
    @endif

    <a href="{{ route('candidature.track.form') }}" style="display:inline-block; background-color:#0b1728; color:#ffffff; text-decoration:none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Suivre ma candidature
    </a>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Pour toute question, n'hésitez pas à contacter l'établissement.
    </p>
@endsection

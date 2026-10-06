@extends('mail.layout')

@section('title', 'Absences non justifiées — '.$student->full_name)
@section('eyebrow', 'Vie scolaire · Absences')

@section('content')
    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Nous vous informons que <strong>{{ $student->full_name }}</strong> cumule à ce jour
        <strong style="color:#b91c1c;">{{ $totalUnjustified }} absences non justifiées</strong>
        depuis le début de l'année scolaire. Nous vous invitons à régulariser sa situation
        (justificatifs) auprès de l'établissement.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eef1f4; border-radius: 10px; overflow: hidden;">
        <tr style="background-color:#f7f9fb;">
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Date</td>
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Matière</td>
        </tr>
        @foreach($recentAbsences as $absence)
            <tr style="border-top: 1px solid #eef1f4;">
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a;">{{ \Illuminate\Support\Carbon::parse($absence->date)->translatedFormat('d/m/Y') }}</td>
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a;">{{ $absence->subject->name ?? '—' }}</td>
            </tr>
        @endforeach
    </table>
    <p style="margin: 10px 0 0; font-size: 12px; color: #7c8ea3;">
        5 absences les plus récentes affichées sur {{ $totalUnjustified }} au total.
    </p>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Pour toute question ou pour transmettre un justificatif, merci de contacter l'établissement.
    </p>
@endsection

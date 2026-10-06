@extends('mail.layout')

@section('title', $summary['total'].' élève(s) à risque')
@section('eyebrow', 'Statistiques · Élèves à risque')

@section('content')
    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Voici le point hebdomadaire sur les élèves cumulant des facteurs de risque (absences non justifiées, moyenne faible, factures en retard) :
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
        <tr>
            <td width="33%" style="padding: 14px; background-color:#fef2f2; border-radius: 10px 0 0 10px; text-align:center;">
                <div style="font-size: 22px; font-weight: bold; color:#b91c1c;">{{ $summary['eleve'] }}</div>
                <div style="font-size: 11px; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Risque élevé</div>
            </td>
            <td width="1" style="background-color:#eef1f4;"></td>
            <td width="33%" style="padding: 14px; background-color:#fffbeb; text-align:center;">
                <div style="font-size: 22px; font-weight: bold; color:#b45309;">{{ $summary['moyen'] }}</div>
                <div style="font-size: 11px; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Risque moyen</div>
            </td>
            <td width="1" style="background-color:#eef1f4;"></td>
            <td width="33%" style="padding: 14px; background-color:#fefce8; border-radius: 0 10px 10px 0; text-align:center;">
                <div style="font-size: 22px; font-weight: bold; color:#a16207;">{{ $summary['faible'] }}</div>
                <div style="font-size: 11px; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Risque faible</div>
            </td>
        </tr>
    </table>

    @foreach($students as $student)
        <div style="padding: 16px 0; border-top: 1px solid #eef1f4;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #15263a;">
                {{ $student['name'] }}
                @if($student['matricule'])
                    <span style="font-weight:400; color:#7c8ea3; font-size:12px;">#{{ $student['matricule'] }}</span>
                @endif
            </p>
            <p style="margin: 3px 0 8px; font-size: 12px; color: #7c8ea3;">
                {{ $student['formation'] ?? 'Formation non définie' }}@if($student['schoolClass']) — {{ $student['schoolClass'] }}@endif
            </p>
            <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #445a72; line-height:1.6;">
                @foreach($student['reasons'] as $reason)
                    <li>{{ $reason }}</li>
                @endforeach
            </ul>
        </div>
    @endforeach

    <div style="margin-top: 28px;">
        <a href="{{ route('admin.statistics.at-risk') }}" style="display:inline-block; background-color:#0b1728; color:#ffffff; text-decoration:none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Voir le détail dans l'admin
        </a>
    </div>
@endsection

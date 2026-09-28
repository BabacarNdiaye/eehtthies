@extends('mail.layout')

@section('title', 'Bilan financier — '.$data['monthLabel'])
@section('eyebrow', 'Comptabilité · Bilan mensuel')

@section('content')
    @php
        $fcfa = fn ($v) => number_format($v, 0, ',', ' ').' FCFA';
        $revDiff = $data['previousRevenue'] > 0 ? (($data['revenue'] - $data['previousRevenue']) / $data['previousRevenue']) * 100 : null;
        $expDiff = $data['previousExpenses'] > 0 ? (($data['expenses'] - $data['previousExpenses']) / $data['previousExpenses']) * 100 : null;
    @endphp

    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Voici le bilan financier de <strong>{{ $data['monthLabel'] }}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td width="50%" style="padding: 16px; background-color:#f0fdf4; border-radius: 10px 0 0 10px;">
                <div style="font-size: 11px; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Recettes</div>
                <div style="font-size: 20px; font-weight:bold; color:#059669; margin-top:2px;">{{ $fcfa($data['revenue']) }}</div>
                @if($revDiff !== null)
                    <div style="font-size: 11px; color:{{ $revDiff >= 0 ? '#059669' : '#dc2626' }}; margin-top:2px;">{{ $revDiff >= 0 ? '+' : '' }}{{ number_format($revDiff, 1) }}% vs mois précédent</div>
                @endif
            </td>
            <td width="4"></td>
            <td width="50%" style="padding: 16px; background-color:#fef2f2; border-radius: 0 10px 10px 0;">
                <div style="font-size: 11px; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Dépenses</div>
                <div style="font-size: 20px; font-weight:bold; color:#dc2626; margin-top:2px;">{{ $fcfa($data['expenses']) }}</div>
                @if($expDiff !== null)
                    <div style="font-size: 11px; color:{{ $expDiff <= 0 ? '#059669' : '#dc2626' }}; margin-top:2px;">{{ $expDiff >= 0 ? '+' : '' }}{{ number_format($expDiff, 1) }}% vs mois précédent</div>
                @endif
            </td>
        </tr>
    </table>

    <p style="margin: 24px 0 0; text-align:center; font-size: 13px; color:#7c8ea3;">
        Solde net du mois<br>
        <span style="font-size: 24px; font-weight:bold; color:{{ $data['net'] >= 0 ? '#059669' : '#dc2626' }};">{{ $fcfa($data['net']) }}</span>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px; font-size: 13px; color:#15263a;">
        <tr>
            <td style="padding: 10px 0; border-top: 1px solid #eef1f4;">Nouvelles factures émises</td>
            <td style="padding: 10px 0; border-top: 1px solid #eef1f4; text-align:right; font-weight:600;">{{ $fcfa($data['newInvoicesAmount']) }}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-top: 1px solid #eef1f4;">Solde total restant à recouvrer</td>
            <td style="padding: 10px 0; border-top: 1px solid #eef1f4; text-align:right; font-weight:600;">{{ $fcfa($data['outstandingBalance']) }}</td>
        </tr>
    </table>

    <div style="margin-top: 28px;">
        <a href="{{ route('admin.statistics.financial') }}" style="display:inline-block; background-color:#0b1728; color:#ffffff; text-decoration:none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Voir le détail dans l'admin
        </a>
    </div>
@endsection

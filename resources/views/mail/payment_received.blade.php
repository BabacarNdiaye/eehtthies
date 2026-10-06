@extends('mail.layout')

@section('title', 'Reçu de paiement — '.$student->full_name)
@section('eyebrow', 'Comptabilité · Reçu de paiement')

@section('content')
    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Nous avons bien reçu votre paiement pour <strong>{{ $student->full_name }}</strong>. Merci.
        Le reçu n° <strong>{{ $receipt['primary']->receipt_number }}</strong> est joint à ce message.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eef1f4; border-radius: 10px; overflow: hidden;">
        <tr style="background-color:#f7f9fb;">
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Facture</td>
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em; text-align:right;">Payé</td>
            @if($receipt['showBalance'])
                <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em; text-align:right;">Reste à payer</td>
            @endif
        </tr>
        @foreach($receipt['payments'] as $payment)
            <tr style="border-top: 1px solid #eef1f4;">
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a;">{{ $payment->invoice->label }}</td>
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a; text-align:right;">{{ number_format((float) $payment->amount, 0, ',', ' ') }} FCFA</td>
                @if($receipt['showBalance'])
                    <td style="padding: 11px 16px; font-size: 13px; color:#15263a; text-align:right;">{{ number_format((float) $payment->balance_after, 0, ',', ' ') }} FCFA</td>
                @endif
            </tr>
        @endforeach
    </table>

    <p style="margin: 20px 0 0; text-align:right; font-size: 13px; color:#7c8ea3;">
        Total reçu : <span style="font-size: 19px; font-weight:bold; color:#15263a;">{{ number_format($receipt['total'], 0, ',', ' ') }} FCFA</span>
    </p>

    <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Payé le {{ \Illuminate\Support\Carbon::parse($receipt['paidAt'])->translatedFormat('d/m/Y') }} — {{ $receipt['channelLabel'] }}@if($receipt['reference']) (réf. {{ $receipt['reference'] }})@endif.
    </p>

    @if($receipt['verificationUrl'])
        <p style="margin: 16px 0 0; font-size: 12px; line-height: 1.7; color: #7c8ea3;">
            Pour vérifier l'authenticité de ce reçu, scannez son QR code ou ouvrez
            <a href="{{ $receipt['verificationUrl'] }}" style="color:#445a72;">{{ $receipt['verificationUrl'] }}</a>.
        </p>
    @endif
@endsection

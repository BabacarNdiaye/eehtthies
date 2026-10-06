@extends('mail.layout')

@section('title', ($upcoming ? 'Échéance proche — ' : 'Rappel de paiement — ').$student->full_name)
@section('eyebrow', $upcoming ? 'Comptabilité · Échéance proche' : 'Comptabilité · Rappel de paiement')

@section('content')
    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #15263a;">
        @if($upcoming)
            Nous vous informons que sur le compte de <strong>{{ $student->full_name }}</strong>,
            {{ $invoices->count() > 1 ? 'des factures arrivent' : 'une facture arrive' }} à échéance dans les prochains jours.
            Merci de prévoir le règlement avant cette date.
        @else
            Nous vous rappelons que le compte de <strong>{{ $student->full_name }}</strong> présente
            {{ $invoices->count() > 1 ? 'des factures impayées' : 'une facture impayée' }} au-delà de la date d'échéance.
            Merci de régulariser dès que possible.
        @endif
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eef1f4; border-radius: 10px; overflow: hidden;">
        <tr style="background-color:#f7f9fb;">
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Facture</td>
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em;">Échéance</td>
            <td style="padding: 11px 16px; font-size: 11px; font-weight:600; color:#7c8ea3; text-transform:uppercase; letter-spacing:.03em; text-align:right;">Solde dû</td>
        </tr>
        @foreach($invoices as $invoice)
            <tr style="border-top: 1px solid #eef1f4;">
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a;">{{ $invoice->label }}</td>
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a;">{{ \Illuminate\Support\Carbon::parse($invoice->due_date)->translatedFormat('d/m/Y') }}</td>
                <td style="padding: 11px 16px; font-size: 13px; color:#15263a; text-align:right;">{{ number_format($invoice->computed_balance, 0, ',', ' ') }} FCFA</td>
            </tr>
        @endforeach
    </table>

    <p style="margin: 20px 0 0; text-align:right; font-size: 13px; color:#7c8ea3;">
        Total dû : <span style="font-size: 19px; font-weight:bold; color:#b91c1c;">{{ number_format($totalDue, 0, ',', ' ') }} FCFA</span>
    </p>

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #445a72;">
        Le paiement peut être effectué en espèces, par virement, par mobile money (Wave, Orange Money, Free Money) ou par chèque auprès du service de comptabilité de l'établissement.
        Si ce message ne vous concerne plus (paiement déjà effectué), merci de nous en excuser et de ne pas en tenir compte.
    </p>
@endsection

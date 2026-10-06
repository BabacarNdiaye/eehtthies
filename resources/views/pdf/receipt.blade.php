<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu {{ $primary->receipt_number }}</title>
    <style>
        @page { margin: 30px 40px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 13px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 14px; margin-bottom: 22px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; }
        .logo { display: inline-block; width: 42px; height: 42px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 42px; font-weight: bold; font-size: 20px; font-family: serif; }
        .school-name { font-family: serif; font-size: 18px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 10px; color: #6c86a3; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 22px; color: #0b1728; text-align: center; margin: 10px 0 24px; }
        .receipt-number { text-align: center; color: #c8942a; font-weight: bold; font-size: 15px; margin-bottom: 24px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.info td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        table.info .label { color: #6c86a3; width: 200px; }
        .amount-box { margin-top: 24px; text-align: center; padding: 20px; background: #fdf9ec; border: 1px solid #f3dd97; border-radius: 8px; }
        .amount-box .value { font-family: serif; font-size: 30px; font-weight: bold; color: #0b1728; }
        .amount-box .label { font-size: 11px; color: #6c86a3; text-transform: uppercase; letter-spacing: 1px; }
        .more { display: block; margin-top: 4px; font-size: 10px; font-weight: normal; color: #6c86a3; }
        table.lines { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.lines th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6c86a3; padding: 8px 10px; border-bottom: 2px solid #e6eaef; }
        table.lines td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        table.lines .num { text-align: right; white-space: nowrap; }
        .verify { display: table; width: 100%; margin-top: 26px; }
        .verify-qr { display: table-cell; width: 86px; vertical-align: middle; }
        .verify-text { display: table-cell; vertical-align: middle; font-size: 10px; color: #6c86a3; }
        .footer { margin-top: 40px; font-size: 10px; color: #6c86a3; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <img src="{{ \App\Support\SiteBrand::file() }}" alt="Logo" style="width: 42px; height: 42px; object-fit: contain; vertical-align: middle;">
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">EEHT de Thiès</div>
                <div class="school-sub">Elite École Hôtelière et Touristique</div>
            </div>
        </div>
        <div class="header-right">
            Émis le {{ \Illuminate\Support\Carbon::parse($paidAt)->translatedFormat('d F Y') }}
        </div>
    </div>

    <h1>Reçu de paiement</h1>
    <p class="receipt-number">
        N° {{ $primary->receipt_number }}
        @if($payments->count() > 1)
            <span class="more">et {{ $payments->count() - 1 }} autre(s) : {{ $payments->skip(1)->pluck('receipt_number')->implode(', ') }}</span>
        @endif
    </p>

    <table class="info">
        <tr>
            <td class="label">Élève</td>
            <td>{{ $student->first_name }} {{ $student->last_name }} ({{ $student->matricule }})</td>
        </tr>
        <tr>
            <td class="label">Date de paiement</td>
            <td>{{ \Illuminate\Support\Carbon::parse($paidAt)->translatedFormat('d F Y') }}</td>
        </tr>
        <tr>
            <td class="label">Mode de paiement</td>
            <td>{{ $channelLabel }}</td>
        </tr>
        @if($reference)
        <tr>
            <td class="label">Référence</td>
            <td>{{ $reference }}</td>
        </tr>
        @endif
        @if($receivedBy)
        <tr>
            <td class="label">Reçu par</td>
            <td>{{ $receivedBy }}</td>
        </tr>
        @endif
    </table>

    <table class="lines">
        <thead>
            <tr>
                <th>Facture</th>
                <th class="num">Montant payé</th>
                @if($showBalance)<th class="num">Reste à payer</th>@endif
            </tr>
        </thead>
        <tbody>
            @foreach($payments as $item)
                <tr>
                    <td>{{ $item->invoice->reference }} — {{ $item->invoice->label }}</td>
                    <td class="num">{{ number_format((float) $item->amount, 0, ',', ' ') }} FCFA</td>
                    @if($showBalance)<td class="num">{{ number_format((float) $item->balance_after, 0, ',', ' ') }} FCFA</td>@endif
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="amount-box">
        <div class="value">{{ number_format($total, 0, ',', ' ') }} FCFA</div>
        <div class="label">Montant reçu</div>
    </div>

    @if($qrCode)
        <div class="verify">
            <div class="verify-qr">
                <img src="data:image/svg+xml;base64,{{ $qrCode }}" width="72" height="72" alt="QR code de vérification">
            </div>
            <div class="verify-text">
                Pour vérifier l'authenticité de ce reçu, scannez ce QR code ou ouvrez :<br>
                <strong>{{ $verificationUrl }}</strong>
            </div>
        </div>
    @endif

    <div class="footer">
        Ce reçu atteste du paiement reçu par l'EEHT de Thiès.
    </div>
</body>
</html>

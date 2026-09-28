<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu {{ $payment->receipt_number }}</title>
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
        .footer { margin-top: 40px; font-size: 10px; color: #6c86a3; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            @if($logoPath = \App\Models\Setting::get('site_logo'))
                <img src="{{ public_path('storage/'.$logoPath) }}" alt="Logo" style="width: 42px; height: 42px; object-fit: contain; vertical-align: middle;">
            @else
                <span class="logo">E</span>
            @endif
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">EEHT de Thiès</div>
                <div class="school-sub">Elite École Hôtelière et Touristique</div>
            </div>
        </div>
        <div class="header-right">
            Émis le {{ \Illuminate\Support\Carbon::parse($payment->paid_at)->translatedFormat('d F Y') }}
        </div>
    </div>

    <h1>Reçu de paiement</h1>
    <p class="receipt-number">N° {{ $payment->receipt_number }}</p>

    <table class="info">
        <tr>
            <td class="label">Élève</td>
            <td>{{ $invoice->student->first_name }} {{ $invoice->student->last_name }} ({{ $invoice->student->matricule }})</td>
        </tr>
        <tr>
            <td class="label">Facture</td>
            <td>{{ $invoice->reference }} — {{ $invoice->label }}</td>
        </tr>
        <tr>
            <td class="label">Mode de paiement</td>
            <td>{{ \App\Models\Payment::METHODS[$payment->method] ?? $payment->method }}</td>
        </tr>
        @if($payment->reference)
        <tr>
            <td class="label">Référence</td>
            <td>{{ $payment->reference }}</td>
        </tr>
        @endif
    </table>

    <div class="amount-box">
        <div class="value">{{ number_format((float) $payment->amount, 0, ',', ' ') }} FCFA</div>
        <div class="label">Montant reçu</div>
    </div>

    <div class="footer">
        Ce reçu atteste du paiement reçu par l'EEHT de Thiès. Document généré automatiquement.
    </div>
</body>
</html>

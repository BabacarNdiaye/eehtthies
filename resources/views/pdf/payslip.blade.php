<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bulletin de salaire — {{ $periodLabel }}</title>
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
        .period { text-align: center; color: #c8942a; font-weight: bold; font-size: 15px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.info td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        table.info .label { color: #6c86a3; width: 200px; }
        .amount-box { margin-top: 24px; text-align: center; padding: 20px; background: #fdf9ec; border: 1px solid #f3dd97; border-radius: 8px; }
        .amount-box .value { font-family: serif; font-size: 30px; font-weight: bold; color: #0b1728; }
        .amount-box .label { font-size: 11px; color: #6c86a3; text-transform: uppercase; letter-spacing: 1px; }
        .signatures { display: table; width: 100%; margin-top: 50px; }
        .signature-box { display: table-cell; width: 50%; text-align: center; font-size: 11px; color: #6c86a3; }
        .signature-line { margin: 0 30px 8px; border-top: 1px solid #c3cede; padding-top: 6px; }
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
            Émis le {{ \Illuminate\Support\Carbon::now()->translatedFormat('d F Y') }}
        </div>
    </div>

    <h1>Bulletin de salaire</h1>
    <p class="period">{{ $periodLabel }}</p>

    <table class="info">
        <tr>
            <td class="label">Membre du personnel</td>
            <td>{{ $name }}</td>
        </tr>
        <tr>
            <td class="label">Fonction</td>
            <td>{{ $position }}</td>
        </tr>
        @if($hoursWorked !== null)
        <tr>
            <td class="label">Heures travaillées</td>
            <td>{{ rtrim(rtrim(number_format($hoursWorked, 2, ',', ' '), '0'), ',') }} h</td>
        </tr>
        @endif
        <tr>
            <td class="label">Mode de paiement</td>
            <td>{{ $paymentMethod }}</td>
        </tr>
        <tr>
            <td class="label">Date de paiement</td>
            <td>{{ \Illuminate\Support\Carbon::parse($paidAt)->translatedFormat('d F Y') }}</td>
        </tr>
    </table>

    <div class="amount-box">
        <div class="value">{{ number_format($amount, 0, ',', ' ') }} FCFA</div>
        <div class="label">Montant net versé</div>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">Signature de l'employé(e)</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Signature de la direction</div>
        </div>
    </div>

    <div class="footer">
        Ce bulletin atteste du paiement de salaire versé par l'EEHT de Thiès.
    </div>
</body>
</html>

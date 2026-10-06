<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bulletin de paie — {{ $periodLabel }}</title>
    <style>
        @page { margin: 30px 40px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 13px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 14px; margin-bottom: 22px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; font-size: 11px; color: #445a72; }
        .logo { display: inline-block; width: 42px; height: 42px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 42px; font-weight: bold; font-size: 20px; font-family: serif; }
        .school-name { font-family: serif; font-size: 18px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 10px; color: #6c86a3; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 22px; color: #0b1728; text-align: center; margin: 10px 0 6px; }
        .period { text-align: center; color: #c8942a; font-weight: bold; font-size: 15px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .reference { text-align: center; color: #6c86a3; font-size: 11px; margin-bottom: 22px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.info td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        table.info .label { color: #6c86a3; width: 200px; }
        table.detail { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.detail th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #6c86a3; padding: 6px 10px; border-bottom: 2px solid #e6eaef; }
        table.detail th.amount, table.detail td.amount { text-align: right; }
        table.detail td { padding: 8px 10px; border-bottom: 1px solid #eef1f4; }
        .plus { color: #15803d; }
        .minus { color: #b91c1c; }
        .amount-box { margin-top: 20px; text-align: center; padding: 18px; background: #fdf9ec; border: 1px solid #f3dd97; border-radius: 8px; }
        .amount-box .value { font-family: serif; font-size: 30px; font-weight: bold; color: #0b1728; }
        .amount-box .label { font-size: 11px; color: #6c86a3; text-transform: uppercase; letter-spacing: 1px; }
        .signatures { display: table; width: 100%; margin-top: 46px; }
        .signature-box { display: table-cell; width: 50%; text-align: center; font-size: 11px; color: #6c86a3; }
        .signature-line { margin: 0 30px 8px; border-top: 1px solid #c3cede; padding-top: 6px; }
        .footer { margin-top: 36px; font-size: 10px; color: #6c86a3; text-align: center; }
    </style>
</head>
<body>
    @php
        $fcfa = fn (float $value) => number_format($value, 0, ',', ' ').' FCFA';
        $hoursText = fn (float $value) => rtrim(rtrim(number_format($value, 2, ',', ' '), '0'), ',');
    @endphp

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

    <h1>Bulletin de paie</h1>
    <p class="period">{{ $periodLabel }}</p>
    <p class="reference">Référence {{ $reference }}</p>

    <table class="info">
        <tr>
            <td class="label">Bénéficiaire</td>
            <td>{{ $name }}</td>
        </tr>
        <tr>
            <td class="label">Fonction</td>
            <td>{{ $position }}</td>
        </tr>
        <tr>
            <td class="label">Mode de versement</td>
            <td>{{ $channelLabel }}@if($accountMasked) · compte {{ $accountMasked }}@endif</td>
        </tr>
        @if($paidAt)
            <tr>
                <td class="label">Date de paiement</td>
                <td>{{ \Illuminate\Support\Carbon::parse($paidAt)->translatedFormat('d F Y') }}</td>
            </tr>
        @endif
    </table>

    <table class="detail">
        <thead>
            <tr>
                <th>Détail</th>
                <th class="amount">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    @if($paymentType === 'horaire' && $hours !== null)
                        Heures travaillées : {{ $hoursText($hours) }} h × {{ $fcfa($hourlyRate ?? 0) }}
                    @else
                        Salaire mensuel de base
                    @endif
                </td>
                <td class="amount">{{ $fcfa($baseAmount) }}</td>
            </tr>
            @foreach($bonuses as $bonus)
                <tr>
                    <td>Prime — {{ $bonus['label'] }}</td>
                    <td class="amount plus">+ {{ $fcfa((float) $bonus['amount']) }}</td>
                </tr>
            @endforeach
            @foreach($deductions as $deduction)
                <tr>
                    <td>Retenue — {{ $deduction['label'] }}</td>
                    <td class="amount minus">− {{ $fcfa((float) $deduction['amount']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="amount-box">
        <div class="value">{{ $fcfa($netAmount) }}</div>
        <div class="label">Net versé</div>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">Signature du bénéficiaire</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Signature de la direction</div>
        </div>
    </div>

    <div class="footer">
        Ce bulletin atteste du paiement du salaire versé par l'EEHT de Thiès. Les retenues et primes sont celles saisies par l'établissement.
    </div>
</body>
</html>

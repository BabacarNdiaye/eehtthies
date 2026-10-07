<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bon de commande {{ $order->number }}</title>
    <style>
        @page { margin: 30px 40px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 12px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 14px; margin-bottom: 22px; }
        .header-left, .header-right { display: table-cell; vertical-align: middle; }
        .header-right { text-align: right; }
        .school-name { font-family: serif; font-size: 18px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 10px; color: #6c86a3; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 22px; color: #0b1728; margin: 6px 0 4px; }
        .number { color: #c8942a; font-weight: bold; font-size: 14px; margin-bottom: 18px; }
        .parties { display: table; width: 100%; margin-bottom: 18px; }
        .party { display: table-cell; width: 50%; vertical-align: top; }
        .party h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6c86a3; margin: 0 0 4px; }
        table.lines { width: 100%; border-collapse: collapse; }
        table.lines th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6c86a3; padding: 8px 10px; border-bottom: 2px solid #e6eaef; }
        table.lines td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        .num { text-align: right; white-space: nowrap; }
        .total { margin-top: 14px; text-align: right; font-size: 15px; font-weight: bold; }
        .notes { margin-top: 18px; padding: 10px 12px; background: #fdf9ec; border: 1px solid #f3dd97; }
        .sign { margin-top: 50px; display: table; width: 100%; }
        .sign div { display: table-cell; width: 50%; font-size: 10px; color: #6c86a3; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <img src="{{ \App\Support\SiteBrand::file() }}" alt="Logo" style="width: 42px; height: 42px; object-fit: contain; vertical-align: middle;">
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">{{ \App\Models\Setting::get('site_name', 'EEHT de Thiès') }}</div>
                <div class="school-sub">Économat</div>
            </div>
        </div>
        <div class="header-right">Émis le {{ now()->translatedFormat('d F Y') }}</div>
    </div>

    <h1>Bon de commande</h1>
    <p class="number">N° {{ $order->number }}</p>

    <div class="parties">
        <div class="party">
            <h2>Fournisseur</h2>
            <strong>{{ $order->supplier->name }}</strong><br>
            @if($order->supplier->contact_name){{ $order->supplier->contact_name }}<br>@endif
            @if($order->supplier->phone){{ $order->supplier->phone }}<br>@endif
            @if($order->supplier->address){{ $order->supplier->address }}@endif
        </div>
        <div class="party">
            <h2>Livraison</h2>
            Date prévue : {{ $order->expected_at ? $order->expected_at->format('d/m/Y') : 'à convenir' }}<br>
            Commandé le : {{ $order->ordered_at ? $order->ordered_at->format('d/m/Y') : '—' }}
        </div>
    </div>

    <table class="lines">
        <thead>
            <tr><th>Article</th><th class="num">Quantité</th><th class="num">Prix unitaire</th><th class="num">Montant</th></tr>
        </thead>
        <tbody>
            @foreach($order->lines as $line)
                <tr>
                    <td>{{ $line->product->name }}</td>
                    <td class="num">{{ rtrim(rtrim(number_format((float) $line->quantity, 2, ',', ' '), '0'), ',') }} {{ $line->product->unit }}</td>
                    <td class="num">{{ number_format((float) $line->unit_cost, 0, ',', ' ') }} FCFA</td>
                    <td class="num">{{ number_format((float) $line->quantity * (float) $line->unit_cost, 0, ',', ' ') }} FCFA</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <p class="total">Total : {{ number_format($order->total, 0, ',', ' ') }} FCFA</p>

    @if($order->notes)
        <div class="notes">{{ $order->notes }}</div>
    @endif

    <div class="sign">
        <div>L'économe<br><br><br>______________________</div>
        <div>Visa de la direction<br><br><br>______________________</div>
    </div>
</body>
</html>

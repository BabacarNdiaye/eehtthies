<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 28px 32px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 11px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 12px; margin-bottom: 18px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; font-size: 10px; color: #6c86a3; }
        .logo { display: inline-block; width: 36px; height: 36px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; font-size: 17px; font-family: serif; }
        .school-name { font-family: serif; font-size: 15px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 9px; color: #6c86a3; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 18px; color: #0b1728; margin: 0 0 2px; }
        .subtitle { font-size: 10px; color: #6c86a3; margin: 0 0 16px; }
        table.meta { width: 100%; margin-bottom: 14px; }
        table.meta td { padding: 2px 0; font-size: 10px; color: #6c86a3; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th { background: #f4f0e6; color: #0b1728; text-align: left; padding: 6px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #c8942a; }
        table.data td { padding: 6px 8px; border-bottom: 1px solid #e6eaef; }
        table.data tr:nth-child(even) td { background: #fafafa; }
        .text-right { text-align: right; }
        .footer { margin-top: 24px; font-size: 9px; color: #a3adb8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <img src="{{ \App\Support\SiteBrand::file() }}" alt="Logo" style="width: 36px; height: 36px; object-fit: contain; vertical-align: middle;">
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">EEHT de Thiès</div>
                <div class="school-sub">Elite École Hôtelière et Touristique</div>
            </div>
        </div>
        <div class="header-right">
            Généré le {{ \Illuminate\Support\Carbon::now()->translatedFormat('d F Y à H:i') }}
        </div>
    </div>

    <h1>{{ $title }}</h1>
    @if(!empty($subtitle))
        <p class="subtitle">{{ $subtitle }}</p>
    @endif

    @if(!empty($meta))
        <table class="meta">
            @foreach($meta as $label => $value)
                <tr><td><strong>{{ $label }}</strong> : {{ $value }}</td></tr>
            @endforeach
        </table>
    @endif

    <table class="data">
        <thead>
            <tr>
                @foreach($columns as $column)
                    <th @if(($column['align'] ?? null) === 'right') class="text-right" @endif>{{ $column['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($columns as $column)
                        <td @if(($column['align'] ?? null) === 'right') class="text-right" @endif>{{ $row[$column['key']] ?? '' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($columns) }}" style="text-align:center; color:#a3adb8;">Aucune donnée.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="footer">EEHT de Thiès</p>
</body>
</html>

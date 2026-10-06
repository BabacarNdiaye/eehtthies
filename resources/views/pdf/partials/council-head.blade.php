<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 30px 34px 46px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 10.5px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 10px; margin-bottom: 14px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; font-size: 10px; color: #4a5f78; }
        .logo { display: inline-block; width: 38px; height: 38px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 38px; font-weight: bold; font-size: 18px; font-family: serif; }
        .school-name { font-family: serif; font-size: 14px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 8.5px; color: #4a5f78; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 17px; color: #0b1728; margin: 0 0 8px; }
        h2 { font-family: serif; font-size: 12.5px; color: #0b1728; margin: 14px 0 6px; border-bottom: 1px solid #e0d6c0; padding-bottom: 3px; }
        table.grid { width: 100%; border-collapse: collapse; }
        table.grid th { background: #f4f0e6; text-align: left; padding: 5px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #c8942a; }
        table.grid td { padding: 5px 6px; border-bottom: 1px solid #e6eaef; vertical-align: top; }
        table.kv td { padding: 3px 10px 3px 0; vertical-align: top; }
        .muted { color: #4a5f78; }
        .internal { color: #b91c1c; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; font-size: 9px; }
        .footer { position: fixed; bottom: -30px; left: 0; right: 0; font-size: 8.5px; color: #4a5f78; border-top: 1px solid #e6eaef; padding-top: 4px; }
        .footer .page:after { content: counter(page); }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <div class="footer">
        {{ $title }} · généré le {{ now()->translatedFormat('d/m/Y H:i') }}
        <span style="float: right;">Page <span class="page"></span></span>
    </div>

    <div class="header">
        <div class="header-left">
            @if($logoPath = \App\Models\Setting::get('site_logo'))
                <img src="{{ public_path('storage/'.$logoPath) }}" alt="Logo" style="width: 38px; height: 38px; object-fit: contain; vertical-align: middle;">
            @else
                <span class="logo">E</span>
            @endif
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">EEHT — Élite École Hôtelière et Touristique</div>
                <div class="school-sub">Thiès</div>
            </div>
        </div>
        <div class="header-right">{{ $title }}</div>
    </div>

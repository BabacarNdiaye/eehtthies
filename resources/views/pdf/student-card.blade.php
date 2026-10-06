<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Cartes d'étudiant</title>
    @php
        // Palette de marque fixe pour les documents officiels (identique aux gabarits
        // de diplôme et d'attestation) — volontairement indépendante de la
        // theme_neutral_color configurable du site web, pour que les cartes imprimées
        // restent cohérentes même si le thème du site change.
        $ink = '#50022b';
        $gold = '#c8942a';
        $accent = '#8bc93f';
        $logoPath = \App\Models\Setting::get('site_logo');
        $schoolName = \App\Models\Setting::get('site_name', 'EEHT de Thiès');
    @endphp
    <style>
        @page { margin: 10mm 8mm; }
        body { font-family: DejaVu Sans, sans-serif; color: #111; }

        .card {
            position: relative;
            float: left;
            width: 85.6mm;
            height: 54mm;
            margin: 3mm;
            border: 0.5px solid #ccc;
            border-radius: 2.5mm;
            overflow: hidden;
            box-sizing: border-box;
            page-break-inside: avoid;
            background: #fff;
        }

        .header-bar { display: table; width: 100%; background: {{ $ink }}; padding: 1.3mm 2.5mm; box-sizing: border-box; }
        .header-bar .logo-cell { display: table-cell; width: 8.5mm; vertical-align: middle; }
        .header-bar .logo-cell img { width: 8.5mm; height: 8.5mm; object-fit: contain; border-radius: 1mm; background: #fff; }
        .header-bar .logo-fallback { display: block; width: 8.5mm; height: 8.5mm; line-height: 8.5mm; text-align: center; background: #fff; color: {{ $ink }}; font-weight: 900; font-family: DejaVu Serif, serif; font-size: 5mm; border-radius: 1mm; }
        .header-bar .name-cell { display: table-cell; vertical-align: middle; padding-left: 2mm; color: #fff; font-family: DejaVu Serif, serif; font-weight: bold; font-size: 8.8px; line-height: 1.25; letter-spacing: 0.2px; }

        .gold-rule { height: 0.8mm; background: {{ $gold }}; }

        .title-bar { text-align: center; padding: 1mm 0 0.9mm; }
        .title-bar span { font-family: DejaVu Serif, serif; font-weight: 700; font-size: 9.5px; letter-spacing: 1.4px; color: {{ $ink }}; text-transform: uppercase; }

        .body-table { display: table; width: 100%; table-layout: fixed; }
        .photo-panel { display: table-cell; width: 23mm; background: {{ $ink }}; vertical-align: top; text-align: center; padding-top: 1.3mm; }
        .photo-frame { display: inline-block; padding: 0.6mm; border: 0.6px solid {{ $gold }}; }
        .photo-box { display: block; width: 19mm; height: 19mm; background: #fff; text-align: center; overflow: hidden; }
        .photo-box img { width: 19mm; height: auto; display: block; }
        .photo-box .placeholder { display: block; padding-top: 8mm; font-size: 5.8px; font-weight: bold; color: {{ $ink }}; }

        .info-panel { display: table-cell; width: 44.5mm; vertical-align: top; padding: 1.3mm 1.6mm 0; font-size: 6.2px; line-height: 1.15; }
        .info-panel .label { font-weight: bold; color: {{ $ink }}; letter-spacing: 0.2px; }
        .info-panel .value { color: #6b4a5c; margin-bottom: 0.6mm; }

        .qr-panel { display: table-cell; width: 18.1mm; vertical-align: top; text-align: center; padding-top: 1.3mm; }
        .qr-wrap { position: relative; display: inline-block; width: 16.5mm; height: 16.5mm; }
        .qr-wrap img { position: absolute; top: 1mm; left: 1mm; width: 14.5mm; height: 14.5mm; }
        .qr-corner { position: absolute; width: 3mm; height: 3mm; }
        .qr-corner.tl { top: 0; left: 0; border-top: 1px solid {{ $accent }}; border-left: 1px solid {{ $accent }}; }
        .qr-corner.tr { top: 0; right: 0; border-top: 1px solid {{ $accent }}; border-right: 1px solid {{ $accent }}; }
        .qr-corner.bl { bottom: 0; left: 0; border-bottom: 1px solid {{ $accent }}; border-left: 1px solid {{ $accent }}; }
        .qr-corner.br { bottom: 0; right: 0; border-bottom: 1px solid {{ $accent }}; border-right: 1px solid {{ $accent }}; }

        .matricule-row { display: table; width: 100%; padding: 0.8mm 2.5mm 0; box-sizing: border-box; }
        .matricule-row .cell { display: table-cell; vertical-align: bottom; }
        .matricule-row .label { font-weight: bold; font-size: 6.4px; color: {{ $ink }}; letter-spacing: 0.2px; }
        .matricule-row .value { font-size: 6.4px; color: #6b4a5c; margin-left: 1.2mm; letter-spacing: 0.4px; }

        .footer-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2mm; background: {{ $ink }}; border-top: 0.6mm solid {{ $gold }}; }
    </style>
</head>
<body>
    @foreach($students as $student)
        <div class="card">
            <div class="header-bar">
                <div class="logo-cell">
                    @if($logoPath)
                        <img src="{{ public_path('storage/'.$logoPath) }}" alt="Logo">
                    @else
                        <span class="logo-fallback">E</span>
                    @endif
                </div>
                <div class="name-cell">{{ $schoolName }}</div>
            </div>
            <div class="gold-rule"></div>

            <div class="title-bar"><span>Carte étudiant</span></div>

            <div class="body-table">
                <div class="photo-panel">
                    <div class="photo-frame">
                        <div class="photo-box">
                            @if($student->photo)
                                <img src="{{ public_path('storage/'.$student->photo) }}" alt="Photo">
                            @else
                                <span class="placeholder">Photo</span>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="info-panel">
                    <div class="label">Nom :</div>
                    <div class="value">{{ $student->last_name }}</div>
                    <div class="label">Prénom :</div>
                    <div class="value">{{ $student->first_name }}</div>
                    <div class="label">Formation :</div>
                    <div class="value">{{ $student->formation->name ?? '—' }}</div>
                    <div class="label">Année académique :</div>
                    <div class="value">{{ $student->academicYear->label ?? '—' }}</div>
                </div>
                <div class="qr-panel">
                    <div class="qr-wrap">
                        <img src="data:image/svg+xml;base64,{{ $student->qr_code }}" alt="QR">
                        <div class="qr-corner tl"></div>
                        <div class="qr-corner tr"></div>
                        <div class="qr-corner bl"></div>
                        <div class="qr-corner br"></div>
                    </div>
                </div>
            </div>

            <div class="matricule-row">
                <div class="cell">
                    <span class="label">Matricule :</span><span class="value">{{ $student->matricule }}</span>
                </div>
            </div>

            <div class="footer-bar"></div>
        </div>
    @endforeach
</body>
</html>

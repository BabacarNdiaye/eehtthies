<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Diplôme — {{ $student->full_name }}</title>
    <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; font-family: DejaVu Sans, sans-serif; }

        .page {
            position: relative;
            width: 297mm;
            height: 210mm;
            background-color: #5e1232;
        }

        /* Colonne décorative de gauche : barre verte + bande à motif, sur toute la hauteur de la page */
        .side-bar {
            position: absolute;
            left: 9mm; top: 0; bottom: 0;
            width: 6mm;
            background-color: #73c33f;
        }
        .side-pattern {
            position: absolute;
            left: 21mm; top: 0; bottom: 0;
            width: 24mm;
            background-color: #ffffff;
            background-image: url('{{ public_path('images/diploma/pattern-tile.png') }}');
            background-repeat: repeat;
            background-size: 11mm 11mm;
        }

        /* Carte de contenu blanche, bordée de vert, à droite de la colonne décorative */
        .card {
            position: absolute;
            left: 52mm; right: 10mm; top: 10mm; bottom: 10mm;
            background-color: #ffffff;
            border: 1.3mm solid #73c33f;
            border-radius: 6mm;
        }

        .inner {
            position: absolute;
            left: 12mm; right: 12mm; top: 9mm; bottom: 9mm;
        }

        .header { display: table; width: 100%; table-layout: fixed; }
        .header .cell { display: table-cell; vertical-align: top; }
        .header .cell.side { width: 38mm; }
        .header .cell.side.right { text-align: right; }
        .header .logo { width: 32mm; }
        .header .site-logo { width: 22mm; max-height: 26mm; object-fit: contain; }
        .header .site-logo-fallback {
            display: inline-block;
            width: 20mm; height: 20mm;
            border-radius: 50%;
            background-color: #5e1232;
            color: #ffffff;
            text-align: center;
            line-height: 20mm;
            font-size: 16px;
            font-weight: 900;
            font-family: serif;
        }

        .title-block { text-align: center; padding-top: 2mm; }
        .title-block .title {
            font-size: 34px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #1a1a1a;
        }
        .title-block .subtitle {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #73c33f;
            text-transform: uppercase;
            margin-top: 1mm;
        }

        .lede {
            text-align: center;
            font-size: 13.5px;
            color: #1a1a1a;
            margin-top: 9mm;
            line-height: 1.6;
        }

        .student-name {
            text-align: center;
            font-size: 26px;
            font-weight: 700;
            color: #5e1232;
            margin-top: 5mm;
        }

        .name-rule {
            width: 90mm;
            margin: 3mm auto 0;
            border-top: 0.6mm solid #5e1232;
        }

        .body-text {
            font-size: 12.5px;
            line-height: 1.85;
            color: #1a1a1a;
            margin-top: 7mm;
        }
        .body-text strong { color: #000; }

        .issue-date {
            font-size: 12.5px;
            color: #1a1a1a;
            margin-top: 8mm;
        }

        .footer-row { display: table; width: 100%; table-layout: fixed; margin-top: 14mm; }
        .footer-row .col { display: table-cell; vertical-align: bottom; }
        .footer-row .signatures { width: 68%; }
        .footer-row .auth { width: 32%; text-align: right; }

        .signatures .row { display: table; width: 100%; table-layout: fixed; }
        .signatures .row .col { display: table-cell; width: 50%; text-align: left; }
        .signatures .label {
            font-size: 11px;
            color: #1a1a1a;
        }

        .auth .caption {
            font-size: 7px;
            color: #6b6b6b;
            margin-top: 1.5mm;
        }
        .auth .ref {
            font-size: 7.5px;
            color: #6b6b6b;
            margin-top: 0.5mm;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="side-bar"></div>
        <div class="side-pattern"></div>

        <div class="card">
            <div class="inner">
                <div class="header">
                    <div class="cell side">
                        <img class="logo" src="{{ public_path('images/diploma/mefpt-logo.png') }}" alt="MEFPT">
                    </div>
                    <div class="cell title-block">
                        <div class="title">DIPLÔME</div>
                        <div class="subtitle">De fin de formation</div>
                    </div>
                    <div class="cell side right">
                        <img class="site-logo" src="{{ \App\Support\SiteBrand::file() }}" alt="Logo EEHT">
                    </div>
                </div>

                <div class="lede">
                    La Directrice de l'Élite École Hôtelière et Touristique (EEHT)<br>
                    certifie que
                </div>

                <div class="student-name">{{ mb_strtoupper($student->full_name) }}</div>
                <div class="name-rule"></div>

                @php
                    $formation = $student->formation;
                    $hasSpecialty = $formation->diploma && $formation->specialty !== $formation->name;
                    $formationClause = $formation->diploma_full_name ?? $formation->name;
                    if ($formation->diploma) {
                        $formationClause .= " ({$formation->diploma})";
                    }
                    if ($hasSpecialty) {
                        $formationClause .= " en {$formation->specialty}";
                    }
                @endphp
                <div class="body-text">
                    @if($student->birth_date)
                        {{ $student->gender === 'F' ? 'Née' : 'Né' }} le <strong>{{ $student->birth_date->format('d/m/Y') }}</strong>
                        @if($student->birth_place)
                            à <strong>{{ $student->birth_place }}</strong>
                        @endif
                    @endif
                    a suivi avec succès le programme de formation
                    @if($student->formatted_training_duration)
                        d'une durée <strong>{{ $student->formatted_training_duration }}</strong>
                    @endif
                    de niveau <strong>{{ $formationClause }}</strong> et lui décerne, en conséquence, le présent
                    {{ $formation->document_type_word }} en reconnaissance des connaissances, compétences et aptitudes
                    professionnelles acquises au terme de sa formation.
                </div>

                <div class="issue-date">
                    Fait à Thiès, le {{ \Illuminate\Support\Carbon::parse($student->diploma_issued_at)->translatedFormat('d F Y') }}
                </div>

                <div class="footer-row">
                    <div class="col signatures">
                        <div class="signatures">
                            <div class="row">
                                <div class="col">
                                    <div class="label">Directrice Générale</div>
                                </div>
                                <div class="col">
                                    <div class="label">Directeur des études et des<br>affaires académiques</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col auth">
                        <img src="data:image/svg+xml;base64,{{ $qrCode }}" width="76" height="76" alt="QR Code de vérification">
                        <div class="caption">Scannez pour vérifier l'authenticité</div>
                        <div class="ref">N° {{ $student->diploma_number }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>

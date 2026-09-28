<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Attestation de stage {{ $internship->attestation_number }}</title>
    <style>
        @page { margin: 40px 50px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 13px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 14px; margin-bottom: 30px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .logo { display: inline-block; width: 42px; height: 42px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 42px; font-weight: bold; font-size: 20px; font-family: serif; }
        .school-name { font-family: serif; font-size: 18px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 10px; color: #6c86a3; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 24px; color: #0b1728; text-align: center; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
        .attestation-number { text-align: center; color: #c8942a; font-weight: bold; font-size: 13px; margin-bottom: 30px; }
        .body-text { line-height: 1.9; font-size: 13px; text-align: justify; margin-bottom: 30px; }
        .body-text strong { color: #0b1728; }
        table.info { width: 100%; border-collapse: collapse; margin: 24px 0; }
        table.info td { padding: 8px 10px; border-bottom: 1px solid #e6eaef; }
        table.info .label { color: #6c86a3; width: 220px; }
        .signature { margin-top: 60px; display: table; width: 100%; }
        .signature-box { display: table-cell; width: 50%; text-align: center; }
        .signature-line { margin-top: 50px; border-top: 1px solid #6c86a3; width: 200px; margin-left: auto; margin-right: auto; padding-top: 6px; font-size: 11px; color: #6c86a3; }
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
    </div>

    <h1>Attestation de stage</h1>
    <p class="attestation-number">N° {{ $internship->attestation_number }}</p>

    <div class="body-text">
        L'Elite École Hôtelière et Touristique de Thiès atteste que
        <strong>{{ $internship->student->first_name }} {{ $internship->student->last_name }}</strong>
        (matricule {{ $internship->student->matricule }}), élève de notre établissement, a effectué un stage
        au sein de <strong>{{ $internship->partner->name }}</strong>
        du <strong>{{ \Illuminate\Support\Carbon::parse($internship->start_date)->translatedFormat('d F Y') }}</strong>
        @if($internship->end_date)
            au <strong>{{ \Illuminate\Support\Carbon::parse($internship->end_date)->translatedFormat('d F Y') }}</strong>
        @endif
        , dans le cadre de sa formation.
    </div>

    <table class="info">
        <tr>
            <td class="label">Intitulé du stage</td>
            <td>{{ $internship->title }}</td>
        </tr>
        @if($internship->supervisor_name)
        <tr>
            <td class="label">Tuteur professionnel</td>
            <td>{{ $internship->supervisor_name }}</td>
        </tr>
        @endif
        @if($internship->evaluation_score !== null)
        <tr>
            <td class="label">Évaluation</td>
            <td>{{ number_format((float) $internship->evaluation_score, 2) }} / 20</td>
        </tr>
        @endif
    </table>

    @if($internship->evaluation_appreciation)
        <div class="body-text">
            <strong>Appréciation :</strong> {{ $internship->evaluation_appreciation }}
        </div>
    @endif

    <div class="body-text">
        Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
    </div>

    <div class="signature">
        <div class="signature-box">
            <div class="signature-line">Le tuteur professionnel</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">La Direction de l'EEHT</div>
        </div>
    </div>

    <div class="footer">
        Fait à Thiès, le {{ \Illuminate\Support\Carbon::now()->translatedFormat('d F Y') }} — Document généré automatiquement.
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bulletin - {{ $reportCard->student->first_name }} {{ $reportCard->student->last_name }}</title>
    <style>
        @page { margin: 2.5cm 2cm 2.5cm 3cm; }
        body { font-family: DejaVu Sans, sans-serif; color: #111; font-size: 10.5px; }

        .top-header { display: table; width: 100%; margin-bottom: 6px; }
        .top-header .cell { display: table-cell; vertical-align: middle; }
        .republic { text-align: center; }
        .republic .title { font-weight: bold; font-size: 13px; }
        .republic .subtitle { font-size: 10px; }
        .school-seal { text-align: right; }
        .school-seal .badge { display: inline-block; width: 40px; height: 40px; border-radius: 50%; background: #0b1728; color: #e2ac37; text-align: center; line-height: 40px; font-family: serif; font-weight: bold; font-size: 18px; }

        .establishment { display: table; width: 100%; margin: 8px 0 6px; }
        .establishment .cell { display: table-cell; vertical-align: top; font-size: 10px; line-height: 1.5; }
        .establishment .right { text-align: right; }
        .establishment strong { color: #0b1728; }

        .title-bar { border: 1.5px solid #111; text-align: center; font-weight: bold; font-size: 13px; padding: 4px; margin-bottom: 8px; letter-spacing: 1px; }

        .student-info { display: table; width: 100%; margin-bottom: 8px; font-size: 10.5px; }
        .student-info .col { display: table-cell; width: 33.33%; vertical-align: top; line-height: 1.6; }
        .student-info strong { color: #0b1728; }

        table.grades { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 10px; }
        table.grades th, table.grades td { border: 1px solid #333; padding: 3px 5px; }
        table.grades th { background: #eef1f4; font-weight: bold; text-align: center; }
        table.grades td.subject { text-align: left; }
        table.grades td.num { text-align: center; }
        table.grades tfoot td { font-weight: bold; background: #f7f7f7; }

        table.summary { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 10px; }
        table.summary td { border: 1px solid #333; padding: 4px 6px; }
        table.summary td.label { font-weight: bold; width: 16%; }

        table.semesters { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
        table.semesters td { border: 1px solid #333; padding: 4px 6px; }
        table.semesters td.label { font-weight: bold; }

        .decisions-mentions { display: table; width: 100%; margin-top: 10px; }
        .decisions-mentions .col { display: table-cell; width: 50%; vertical-align: top; padding-right: 8px; }
        table.checklist { width: 100%; border-collapse: collapse; font-size: 10px; }
        table.checklist td { border: 1px solid #333; padding: 4px 6px; }
        table.checklist td.check { width: 26px; text-align: center; font-weight: bold; }

        .observations { margin-top: 10px; }
        .observations .box { border: 1px solid #333; min-height: 34px; padding: 5px 7px; font-size: 10px; }

        .footer-sign { display: table; width: 100%; margin-top: 16px; }
        .footer-sign .cell { display: table-cell; vertical-align: bottom; }
        .footer-sign .right { text-align: right; }
        .footer-sign .role { margin-top: 30px; font-size: 10.5px; }
    </style>
</head>
<body>
    <div class="top-header">
        <div class="cell school-seal" style="width: 90px; text-align: left;">
            @if($logoPath = \App\Models\Setting::get('site_logo'))
                <img src="{{ public_path('storage/'.$logoPath) }}" alt="Logo" style="width: 44px; height: 44px; object-fit: contain;">
            @else
                <span class="badge">E</span>
            @endif
        </div>
        <div class="cell republic">
            <div class="title">République du Sénégal</div>
            <div class="subtitle">Un Peuple - Un But - Une Foi</div>
        </div>
        <div class="cell" style="width: 90px;"></div>
    </div>

    <div class="establishment">
        <div class="cell">
            Établissement : <strong>{{ \App\Models\Setting::get('site_name', 'EEHT de Thiès') }}</strong><br>
            Téléphone : {{ \App\Models\Setting::get('site_phone', '—') }}<br>
            Adresse : {{ \App\Models\Setting::get('site_address', '—') }}<br>
            E-mail : {{ \App\Models\Setting::get('site_email', '—') }}
        </div>
        <div class="cell right">
            Année Scolaire : <strong>{{ $reportCard->academicYear->label }}</strong><br>
            <strong>{{ $reportCard->term }}</strong>
        </div>
    </div>

    <div class="title-bar">BULLETIN DE NOTES</div>

    <div class="student-info">
        <div class="col">
            Prénom(s) : <strong>{{ $reportCard->student->first_name }}</strong><br>
            Né(e) le : {{ $reportCard->student->birth_date?->format('d/m/Y') ?? '—' }}<br>
            N° Dossier : {{ $reportCard->student->matricule }}
        </div>
        <div class="col">
            Nom : <strong>{{ $reportCard->student->last_name }}</strong><br>
            à {{ $reportCard->student->birth_place ?? '—' }}<br>
            Nombre d'élèves : {{ $reportCard->class_size ?? '—' }}
        </div>
        <div class="col">
            Moyenne de la classe : <strong>{{ $reportCard->class_average !== null ? number_format((float) $reportCard->class_average, 2) : '—' }}</strong><br>
            Classe : {{ $reportCard->schoolClass->name }}<br>
            Classe redoublée : {{ $reportCard->student->is_repeating ? 'OUI' : 'NEANT' }}
        </div>
    </div>

    <table class="grades">
        <thead>
            <tr>
                <th style="width: 22%;">DISCIPLINES</th>
                <th>DEVOIR</th>
                <th>COMP</th>
                <th>MOY/20</th>
                <th>COEF</th>
                <th>MOY X</th>
                <th>RANG</th>
                <th style="width: 18%;">APPRÉCIATION</th>
            </tr>
        </thead>
        <tbody>
            @php($totalCoef = 0)
            @php($totalMoyX = 0)
            @forelse($subjects as $s)
                @if($s['moy20'] !== null)
                    @php($totalCoef += $s['coefficient'])
                    @php($totalMoyX += $s['moyx'])
                @endif
                <tr>
                    <td class="subject">{{ $s['subject'] }}</td>
                    <td class="num">{{ $s['devoir'] !== null ? number_format($s['devoir'], 2) : '—' }}</td>
                    <td class="num">{{ $s['composition'] !== null ? number_format($s['composition'], 2) : '—' }}</td>
                    <td class="num">{{ $s['moy20'] !== null ? number_format($s['moy20'], 2) : '—' }}</td>
                    <td class="num">{{ $s['coefficient'] }}</td>
                    <td class="num">{{ $s['moyx'] !== null ? number_format($s['moyx'], 2) : '—' }}</td>
                    <td class="num">{{ $s['rank'] ? $s['rank'].'/'.$s['class_size'] : '—' }}</td>
                    <td>{{ $s['appreciation'] ?? '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="8" style="text-align:center;">Aucune note enregistrée pour cette période.</td></tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <td class="subject">TOTAL : {{ number_format($totalMoyX, 2) }}</td>
                <td colspan="3"></td>
                <td class="num">{{ $totalCoef }}</td>
                <td class="num">{{ number_format($totalMoyX, 2) }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <table class="summary">
        <tr>
            <td class="label">MOYENNE : {{ $reportCard->average !== null ? number_format((float) $reportCard->average, 2) : '—' }}</td>
            <td class="label" style="width: 12%;">RANG</td>
            <td>{{ $reportCard->rank ?? '—' }}</td>
            <td class="label" style="width: 12%;">RETARD</td>
            <td>{{ $reportCard->retard_count }}</td>
            <td class="label" style="width: 12%;">ABSENCE</td>
            <td>{{ $reportCard->absence_count }} &nbsp; <span style="font-weight: normal;">Dont {{ $reportCard->unjustified_absence_count }} non justifiée(s)</span></td>
        </tr>
    </table>

    @if($reportCard->previous_term_average !== null || $reportCard->annual_average !== null)
        <table class="semesters">
            <tr>
                <td class="label">Moyenne 1er Semestre</td>
                <td>{{ $reportCard->previous_term_average !== null ? number_format((float) $reportCard->previous_term_average, 2) : '—' }}</td>
                <td class="label">Moyenne 2ème Semestre</td>
                <td>{{ number_format((float) $reportCard->average, 2) }}</td>
                <td class="label">Moyenne Annuelle</td>
                <td>{{ $reportCard->annual_average !== null ? number_format((float) $reportCard->annual_average, 2) : '—' }}</td>
                <td class="label">Rang</td>
                <td>{{ $reportCard->annual_rank ?? '—' }}</td>
            </tr>
        </table>
    @endif

    <div class="decisions-mentions">
        <div class="col">
            <table class="checklist">
                <tr><td>Admis(e) en classe supérieure</td><td class="check">{{ $reportCard->decision === 'admis' ? 'X' : '' }}</td></tr>
                <tr><td>Autorisé(e) à redoubler</td><td class="check">{{ $reportCard->decision === 'redouble' ? 'X' : '' }}</td></tr>
                <tr><td>Exclusion</td><td class="check">{{ $reportCard->decision === 'exclu' ? 'X' : '' }}</td></tr>
            </table>
        </div>
        <div class="col">
            <table class="checklist">
                <tr><td>Félicitations</td><td class="check">{{ $reportCard->mention === 'felicitations' ? 'X' : '' }}</td></tr>
                <tr><td>Encouragement</td><td class="check">{{ $reportCard->mention === 'encouragement' ? 'X' : '' }}</td></tr>
                <tr><td>Tableau d'honneur</td><td class="check">{{ $reportCard->mention === 'tableau_honneur' ? 'X' : '' }}</td></tr>
                <tr><td>Avertissement</td><td class="check">{{ $reportCard->mention === 'avertissement' ? 'X' : '' }}</td></tr>
                <tr><td>Blâme</td><td class="check">{{ $reportCard->mention === 'blame' ? 'X' : '' }}</td></tr>
            </table>
        </div>
    </div>

    <div class="observations">
        <strong>Observations du conseil des professeurs</strong>
        <div class="box">{{ $reportCard->general_appreciation }}</div>
    </div>

    <div class="footer-sign">
        <div class="cell" style="width: 60%;">
            <div style="font-size: 9px; color: #555;">
                Document généré le {{ \Illuminate\Support\Carbon::now()->translatedFormat('d F Y à H:i') }}<br>
                Référence de vérification : {{ $reportCard->qr_token }}
            </div>
        </div>
        <div class="cell right">
            <img src="data:image/svg+xml;base64,{{ $qrCode }}" width="64" height="64" alt="QR Code de vérification"><br>
            <span class="role">Le Chef d'Établissement</span>
        </div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Procès-verbal du conseil de classe</title>
    <style>
        @page { margin: 30px 34px 52px; }
        body { font-family: DejaVu Sans, sans-serif; color: #15263a; font-size: 10.5px; }
        .header { display: table; width: 100%; border-bottom: 3px solid #c8942a; padding-bottom: 10px; margin-bottom: 14px; }
        .header-left { display: table-cell; vertical-align: middle; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; font-size: 10px; color: #4a5f78; }
        .logo { display: inline-block; width: 38px; height: 38px; background: #0b1728; color: #e2ac37; border-radius: 50%; text-align: center; line-height: 38px; font-weight: bold; font-size: 18px; font-family: serif; }
        .school-name { font-family: serif; font-size: 14px; font-weight: bold; color: #0b1728; }
        .school-sub { font-size: 8.5px; color: #4a5f78; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-family: serif; font-size: 18px; color: #0b1728; margin: 0 0 4px; }
        h2 { font-family: serif; font-size: 12.5px; color: #0b1728; margin: 16px 0 6px; border-bottom: 1px solid #e0d6c0; padding-bottom: 3px; }
        table.grid { width: 100%; border-collapse: collapse; }
        table.grid th { background: #f4f0e6; text-align: left; padding: 5px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #c8942a; }
        table.grid td { padding: 5px 6px; border-bottom: 1px solid #e6eaef; vertical-align: top; }
        table.kv td { padding: 2px 8px 2px 0; vertical-align: top; }
        .muted { color: #4a5f78; }
        .stats td { text-align: center; padding: 6px; border: 1px solid #e6eaef; }
        .stats .value { font-size: 14px; font-weight: bold; font-family: serif; }
        .signatures { width: 100%; margin-top: 18px; }
        .signatures td { width: 25%; height: 70px; vertical-align: top; border-top: 1px solid #15263a; padding-top: 4px; font-size: 9.5px; }
        .watermark { position: fixed; top: 38%; left: 8%; font-size: 92px; color: #b91c1c; opacity: 0.12; transform: rotate(-30deg); font-weight: bold; }
        .footer { position: fixed; bottom: -36px; left: 0; right: 0; font-size: 8.5px; color: #4a5f78; border-top: 1px solid #e6eaef; padding-top: 4px; }
        .footer .page:after { content: counter(page); }
        .rectification { background: #fff7e6; border: 1px solid #c8942a; padding: 6px 8px; margin-bottom: 10px; }
    </style>
</head>
<body>
    @if($draft)
        <div class="watermark">BROUILLON</div>
    @endif

    <div class="footer">
        <span>{{ $number ?? 'Brouillon' }}{{ $version ? ' · version '.$version : '' }}</span>
        @if($contentHash)
            · Empreinte {{ substr($contentHash, 0, 16) }}
        @endif
        @if($council->closed_at)
            · Clôturé le {{ $council->closed_at->translatedFormat('d F Y à H:i') }}
        @endif
        · Généré le {{ now()->translatedFormat('d/m/Y H:i') }}
        <span style="float: right;">Page <span class="page"></span></span>
    </div>

    <div class="header">
        <div class="header-left">
            <img src="{{ \App\Support\SiteBrand::file() }}" alt="Logo" style="width: 38px; height: 38px; object-fit: contain; vertical-align: middle;">
            <div style="display:inline-block; vertical-align: middle; margin-left: 8px;">
                <div class="school-name">EEHT — Élite École Hôtelière et Touristique</div>
                <div class="school-sub">Thiès</div>
            </div>
        </div>
        <div class="header-right">
            <strong>{{ $number ?? 'Brouillon non numéroté' }}</strong><br>
            {{ $version ? 'Version '.$version : 'Document de travail' }}
        </div>
    </div>

    <h1>Procès-verbal du conseil de classe</h1>

    @if($rectification)
        <div class="rectification"><strong>Version rectifiée.</strong> Motif : {{ $rectification }}</div>
    @endif

    <table class="kv">
        <tr><td class="muted">Année scolaire</td><td>{{ $council->academicYear?->label }}</td><td class="muted">Période</td><td>{{ $council->term }}{{ $council->is_end_of_year ? ' (conseil de fin d’année)' : '' }}</td></tr>
        <tr><td class="muted">Classe</td><td>{{ $council->schoolClass?->name }}</td><td class="muted">Formation</td><td>{{ $council->schoolClass?->formation?->name }}</td></tr>
        <tr>
            <td class="muted">Date</td>
            <td>{{ $council->started_at?->translatedFormat('l d F Y') ?? $council->scheduled_at?->translatedFormat('l d F Y') }}</td>
            <td class="muted">Horaires</td>
            <td>{{ $council->started_at?->format('H:i') ?? '—' }} – {{ $council->ended_at?->format('H:i') ?? '—' }}</td>
        </tr>
        <tr><td class="muted">Lieu</td><td>{{ $council->room ?? '—' }}</td><td class="muted">Président(e)</td><td>{{ $council->president?->name ?? '—' }}</td></tr>
        <tr><td class="muted">Secrétaire de séance</td><td>{{ $council->secretary?->name ?? '—' }}</td><td class="muted">Professeur principal</td><td>{{ $council->mainTeacher?->name ?? '—' }}</td></tr>
    </table>

    <h2>Membres</h2>
    <table class="grid">
        <thead><tr><th style="width: 22%">Présence</th><th>Membres</th></tr></thead>
        <tbody>
            @foreach(['present' => 'Présents', 'excused' => 'Excusés', 'absent' => 'Absents'] as $key => $label)
                <tr>
                    <td>{{ $label }} ({{ count($members[$key]) }})</td>
                    <td>{{ collect($members[$key])->map(fn ($m) => $m['name'].' — '.$m['function'].(! empty($m['remote']) ? ' (à distance)' : ''))->implode(' ; ') ?: '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Situation de la classe</h2>
    <table class="stats" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td><div class="value">{{ $summary['count'] }}</div>élèves</td>
            <td><div class="value">{{ $summary['average'] !== null ? number_format($summary['average'], 2, ',', ' ') : '—' }}</div>moyenne de classe</td>
            <td><div class="value">{{ $summary['max'] !== null ? number_format($summary['max'], 2, ',', ' ') : '—' }} / {{ $summary['min'] !== null ? number_format($summary['min'], 2, ',', ' ') : '—' }}</div>meilleure / plus faible</td>
            <td><div class="value">{{ $summary['pass_rate'] !== null ? number_format($summary['pass_rate'], 1, ',', ' ').' %' : '—' }}</div>taux ≥ 10</td>
            <td><div class="value">{{ $summary['alerts']['red'] }} · {{ $summary['alerts']['orange'] }} · {{ $summary['alerts']['green'] }}</div>attention · vigilance · favorable</td>
            <td><div class="value">{{ number_format($summary['unjustified_hours'], 1, ',', ' ') }} h</div>absences non justifiées</td>
        </tr>
    </table>

    <h2>Synthèse pédagogique et observations générales</h2>
    <p style="white-space: pre-line;">{{ $council->general_observations ?: '—' }}</p>
    @if($council->session_notes)
        <p class="muted" style="white-space: pre-line;"><strong>Notes de séance :</strong> {{ $council->session_notes }}</p>
    @endif

    <h2>Décisions individuelles</h2>
    <table class="grid">
        <thead><tr><th style="width: 24%">Élève</th><th style="width: 9%">Moyenne</th><th style="width: 7%">Rang</th><th style="width: 22%">Décision(s)</th><th>Appréciation générale</th></tr></thead>
        <tbody>
            @foreach($students as $row)
                <tr>
                    <td>{{ $row['name'] }}<br><span class="muted">{{ $row['matricule'] }}{{ $row['left'] ? ' · sorti(e) de la classe' : '' }}</span></td>
                    <td>{{ $row['average'] !== null ? number_format($row['average'], 2, ',', ' ') : '—' }}</td>
                    <td>{{ $row['rank'] ?? '—' }}</td>
                    <td>{{ implode(', ', $row['decisions']) ?: '—' }}</td>
                    <td>{{ $row['appreciation'] ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if(count($votes ?? []) > 0)
        <h2>Votes</h2>
        <table class="grid">
            <thead><tr><th style="width: 24%">Élève</th><th style="width: 22%">Objet</th><th style="width: 16%">Mode</th><th style="width: 18%">Pour · contre · abst.</th><th>Résultat</th></tr></thead>
            <tbody>
                @foreach($votes as $vote)
                    <tr>
                        <td>{{ $vote['student'] }}</td>
                        <td>{{ $vote['decision'] }}</td>
                        <td>{{ $vote['mode'] }}, {{ mb_strtolower($vote['secrecy']) }}</td>
                        <td>{{ $vote['count']['for'] }} · {{ $vote['count']['against'] }} · {{ $vote['count']['abstentions'] }} <span class="muted">({{ $vote['present'] }} présents)</span></td>
                        <td><strong>{{ $vote['result'] }}</strong>{{ $vote['tie_broken'] ? ' — voix prépondérante du président' : '' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>Recommandations et actions de suivi</h2>
    <p style="white-space: pre-line;">{{ $council->recommendations ?: '—' }}</p>
    @if(count($followUps) > 0)
        <ul>
            @foreach($followUps as $line)
                <li>{{ $line }}</li>
            @endforeach
        </ul>
    @endif

    @if(count($validations) > 0)
        <h2>Circuit de validation</h2>
        <table class="grid">
            <thead><tr><th>Date</th><th>Étape</th><th>Action</th><th>Par</th><th>Commentaire</th></tr></thead>
            <tbody>
                @foreach($validations as $validation)
                    <tr>
                        <td>{{ $validation->acted_at->format('d/m/Y H:i') }}</td>
                        <td>{{ \App\Models\CouncilValidation::STEPS[$validation->step] ?? $validation->step }}</td>
                        <td>{{ \App\Models\CouncilValidation::ACTIONS[$validation->action] ?? $validation->action }}</td>
                        <td>{{ $validation->user?->name ?? '—' }}</td>
                        <td>{{ $validation->comment ?? '' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>Signatures</h2>
    <table class="signatures">
        <tr>
            <td>Président(e) du conseil</td>
            <td>Professeur principal</td>
            <td>Responsable pédagogique</td>
            <td>Direction</td>
        </tr>
    </table>
</body>
</html>

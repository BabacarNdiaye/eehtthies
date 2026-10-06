@include('pdf.partials.council-head', ['title' => 'Fiche préparatoire — document interne'])

    <p class="internal">Document interne — ne pas diffuser aux familles</p>
    <h1>Fiche préparatoire · {{ $council->schoolClass?->name }} · {{ $council->term }}</h1>

    <table class="grid">
        <thead><tr><th>Effectif</th><th>Moyenne de classe</th><th>Plus forte / plus faible</th><th>Taux ≥ 10</th><th>Attention · vigilance · favorable</th><th>Absences non justifiées</th></tr></thead>
        <tbody>
            <tr>
                <td>{{ $summary['count'] }}</td>
                <td>{{ $summary['average'] !== null ? number_format($summary['average'], 2, ',', ' ') : '—' }}</td>
                <td>{{ $summary['max'] !== null ? number_format($summary['max'], 2, ',', ' ') : '—' }} / {{ $summary['min'] !== null ? number_format($summary['min'], 2, ',', ' ') : '—' }}</td>
                <td>{{ $summary['pass_rate'] !== null ? number_format($summary['pass_rate'], 1, ',', ' ').' %' : '—' }}</td>
                <td>{{ $summary['alerts']['red'] }} · {{ $summary['alerts']['orange'] }} · {{ $summary['alerts']['green'] }}</td>
                <td>{{ number_format($summary['unjustified_hours'], 1, ',', ' ') }} h</td>
            </tr>
        </tbody>
    </table>

    @foreach($students as $item)
        @php($row = $item['row'])
        @php($snapshot = $row->snapshot ?? [])
        <div class="page-break"></div>
        <p class="internal">Document interne</p>
        <h1>{{ $row->student?->full_name }} <span class="muted" style="font-size: 11px;">{{ $row->student?->matricule }}{{ $row->has_left_class ? ' · sorti(e) de la classe' : '' }}</span></h1>
        <table class="kv">
            <tr>
                <td class="muted">Moyenne</td><td><strong>{{ $row->general_average !== null ? number_format($row->general_average, 2, ',', ' ') : '—' }}</strong></td>
                <td class="muted">Rang</td><td>{{ $row->rank ? $row->rank.' / '.$row->class_size : '—' }}</td>
                <td class="muted">Progression</td><td>{{ $row->progression !== null ? number_format($row->progression, 2, ',', ' ') : '—' }}</td>
                <td class="muted">Pastille</td><td>{{ \App\Models\CouncilStudent::ALERT_LEVELS[$row->alert_level] ?? '—' }}</td>
            </tr>
        </table>
        @if(! empty($row->alert_reasons))
            <p class="muted">Motifs : {{ implode(' ; ', $row->alert_reasons) }}</p>
        @endif

        <h2>Résultats</h2>
        <table class="grid">
            <thead><tr><th>Matière</th><th>Coef.</th><th>Moyenne</th><th>Rang</th><th>Appréciation de l’enseignant</th></tr></thead>
            <tbody>
                @foreach($snapshot['subjects'] ?? [] as $subject)
                    @php($observation = collect($item['observations'])->firstWhere('subject_id', $subject['id']))
                    <tr>
                        <td>{{ $subject['name'] }}</td>
                        <td>{{ $subject['coefficient'] }}</td>
                        <td>{{ $subject['moy20'] !== null ? number_format($subject['moy20'], 2, ',', ' ') : '—' }}</td>
                        <td>{{ $subject['rank'] ? $subject['rank'].' / '.$subject['class_size'] : '—' }}</td>
                        <td>
                            {{ $observation['appreciation'] ?? '' }}
                            @if(! empty($observation['internal_note']))<br><span class="muted">Interne : {{ $observation['internal_note'] }}</span>@endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <h2>Assiduité et discipline</h2>
        <p>
            {{ number_format($snapshot['attendance']['unjustified_hours'] ?? 0, 1, ',', ' ') }} h d’absence non justifiée ·
            {{ number_format($snapshot['attendance']['justified_hours'] ?? 0, 1, ',', ' ') }} h justifiée ·
            {{ $snapshot['attendance']['late_count'] ?? 0 }} retard(s) ·
            {{ $snapshot['discipline']['count'] ?? 0 }} sanction(s)
        </p>
        @foreach($snapshot['discipline']['records'] ?? [] as $record)
            <p class="muted">{{ \Illuminate\Support\Carbon::parse($record['date'])->format('d/m/Y') }} — {{ $record['label'] }} : {{ $record['reason'] }}</p>
        @endforeach

        <h2>Synthèse du professeur principal</h2>
        <p style="white-space: pre-line;">{{ $row->main_teacher_summary ?: '—' }}</p>
    @endforeach
</body>
</html>

@include('pdf.partials.council-head', ['title' => 'Convocation au conseil de classe'])

    <h1>Convocation au conseil de classe</h1>

    <table class="kv">
        <tr><td class="muted">Classe</td><td>{{ $council->schoolClass?->name }} — {{ $council->schoolClass?->formation?->name }}</td></tr>
        <tr><td class="muted">Période</td><td>{{ $council->term }} · {{ $council->academicYear?->label }}{{ $council->is_end_of_year ? ' (conseil de fin d’année)' : '' }}</td></tr>
        <tr><td class="muted">Date et heure</td><td>{{ $council->scheduled_at?->translatedFormat('l d F Y à H:i') ?? 'À préciser' }}</td></tr>
        <tr><td class="muted">Salle</td><td>{{ $council->room ?? '—' }}</td></tr>
        <tr><td class="muted">Président(e)</td><td>{{ $council->president?->name ?? '—' }}</td></tr>
        @if($council->preconseil_deadline)
            <tr><td class="muted">Appréciations à saisir avant le</td><td>{{ $council->preconseil_deadline->translatedFormat('d F Y à H:i') }}</td></tr>
        @endif
    </table>

    <h2>Ordre du jour</h2>
    <p style="white-space: pre-line;">{{ $council->agenda ?: 'Examen de la situation de chaque élève ; décisions du conseil.' }}</p>

    <h2>Membres convoqués</h2>
    <table class="grid">
        <thead><tr><th>Nom</th><th>Fonction</th></tr></thead>
        <tbody>
            @foreach($members as $member)
                <tr><td>{{ $member['name'] }}</td><td>{{ $member['function'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>

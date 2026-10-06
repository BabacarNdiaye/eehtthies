@include('pdf.partials.council-head', ['title' => 'Relevé de décisions du conseil de classe'])

    <h1>Relevé de décisions</h1>
    <table class="kv">
        <tr><td class="muted">Élève</td><td><strong>{{ $row->student?->full_name }}</strong> ({{ $row->student?->matricule }})</td></tr>
        <tr><td class="muted">Classe</td><td>{{ $council->schoolClass?->name }} — {{ $council->schoolClass?->formation?->name }}</td></tr>
        <tr><td class="muted">Période</td><td>{{ $council->term }} · {{ $council->academicYear?->label }}</td></tr>
        <tr><td class="muted">Conseil clôturé le</td><td>{{ $council->closed_at?->translatedFormat('d F Y') ?? '—' }}</td></tr>
        <tr><td class="muted">Moyenne · rang</td><td>{{ $row->general_average !== null ? number_format($row->general_average, 2, ',', ' ') : '—' }} · {{ $row->rank ? $row->rank.' / '.$row->class_size : '—' }}</td></tr>
    </table>

    <h2>Décision(s) du conseil</h2>
    @forelse($decisions as $decision)
        <p>
            <strong>{{ $decision->type?->label }}</strong>
            @if($decision->status === \App\Models\CouncilDecision::PROVISIONAL) <em>(provisoire : recours en cours)</em> @endif
        </p>
    @empty
        <p>—</p>
    @endforelse

    <h2>Appréciation générale du conseil</h2>
    <p style="white-space: pre-line;">{{ $row->general_appreciation ?: '—' }}</p>

    @if($observations->isNotEmpty())
        <h2>Appréciations des enseignants</h2>
        <table class="grid">
            <thead><tr><th>Matière</th><th>Appréciation</th></tr></thead>
            <tbody>
                @foreach($observations as $observation)
                    <tr><td>{{ $observation['subject'] }}</td><td>{{ $observation['appreciation'] }}</td></tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if($followUps->isNotEmpty())
        <h2>Actions de suivi</h2>
        <table class="grid">
            <thead><tr><th>Action</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
            <tbody>
                @foreach($followUps as $followUp)
                    <tr>
                        <td>{{ $followUp->problem }}{{ $followUp->action ? ' — '.$followUp->action : '' }}</td>
                        <td>{{ $followUp->owner?->name ?? '—' }}</td>
                        <td>{{ $followUp->due_date?->format('d/m/Y') ?? '—' }}</td>
                        <td>{{ \App\Models\CouncilFollowUp::STATUSES[$followUp->status] ?? $followUp->status }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>

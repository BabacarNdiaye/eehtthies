@include('pdf.partials.council-head', ['title' => 'Convocation à un entretien'])

    <h1>Convocation à un entretien</h1>

    <p>Madame, Monsieur,</p>
    <p>
        À la suite du conseil de classe {{ $followUp->council?->schoolClass?->name }} ({{ $followUp->council?->term }}), nous souhaitons vous rencontrer au sujet de
        <strong>{{ $followUp->student?->full_name }}</strong>.
    </p>

    <table class="kv">
        <tr><td class="muted">Motif</td><td>{{ $followUp->problem }}</td></tr>
        <tr><td class="muted">Date proposée</td><td>{{ $followUp->interview_at?->translatedFormat('l d F Y à H:i') ?? 'à convenir avec l’établissement' }}</td></tr>
        <tr><td class="muted">Vous serez reçu(e) par</td><td>{{ $followUp->owner?->name ?? 'l’équipe pédagogique' }}</td></tr>
    </table>

    <p>Si la date ne vous convient pas, merci de contacter l’établissement pour en convenir d’une autre.</p>

    <table style="width: 100%; margin-top: 40px;">
        <tr>
            <td style="width: 50%;">Fait à Thiès, le {{ now()->translatedFormat('d F Y') }}</td>
            <td style="width: 50%; text-align: right;">La Direction</td>
        </tr>
    </table>
</body>
</html>

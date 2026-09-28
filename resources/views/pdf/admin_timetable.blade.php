<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: "DejaVu Sans", sans-serif; color: #222; font-size: 12px }
        header { text-align:center; margin-bottom: 12px }
        h1 { font-size: 18px; margin: 6px 0 }
        h2 { font-size: 14px; margin: 12px 0 6px }
        table { width:100%; border-collapse:collapse; margin-bottom:12px }
        th, td { border:1px solid #ccc; padding:6px; text-align:left }
        th { background:#f5f5f5 }
        .time { width: 120px }
    </style>
</head>
<body>
    <header>
        <div>Établissement: {{ config('app.name') }}</div>
        <h1>Emploi du temps — {{ $schoolClass->name ?? 'Classe' }}</h1>
    </header>

    @if($entries->isEmpty())
        <p>Aucun emploi du temps trouvé pour cette classe.</p>
    @else
        <table>
            <thead>
                <tr>
                    <th>Jour</th>
                    <th class="time">Heure</th>
                    <th>Matière</th>
                    <th>Professeur</th>
                    <th>Salle</th>
                </tr>
            </thead>
            <tbody>
                @foreach($entries as $entry)
                    <tr>
                        <td>{{ $days[$entry->day_of_week] ?? $entry->day_of_week }}</td>
                        <td class="time">{{ substr($entry->start_time, 0, 5) }} - {{ substr($entry->end_time, 0, 5) }}</td>
                        <td>{{ $entry->subject->name ?? '' }}</td>
                        <td>{{ isset($entry->teacher) ? ($entry->teacher->first_name . ' ' . $entry->teacher->last_name) : '' }}</td>
                        <td>{{ $entry->room->name ?? '' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <footer style="position:fixed; bottom:10px; left:10px; font-size:11px; color:#666">Généré le {{ now()->format('Y-m-d H:i') }}</footer>
</body>
</html>
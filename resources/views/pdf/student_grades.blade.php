<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: "DejaVu Sans", sans-serif; color: #222; font-size: 12px }
        header { text-align:center; margin-bottom: 12px }
        h1 { font-size: 18px; margin: 6px 0 }
        table { width:100%; border-collapse:collapse; margin-bottom:12px }
        th, td { border:1px solid #ccc; padding:6px; text-align:left }
        th { background:#f5f5f5 }
        .small { font-size:11px }
    </style>
</head>
<body>
    <header>
        <div class="small">{{ config('app.name') }}</div>
        <h1>Relevé de notes — {{ $student->first_name }} {{ $student->last_name }}</h1>
        <div class="small">Matricule : {{ $student->matricule }} · Classe : {{ $student->schoolClass->name ?? '—' }}</div>
    </header>

    @if($exams->isEmpty())
        <p>Aucune note publiée pour le moment.</p>
    @else
        <table>
            <thead>
                <tr>
                    <th>Épreuve</th>
                    <th>Matière</th>
                    <th>Date</th>
                    <th>Note</th>
                </tr>
            </thead>
            <tbody>
                @foreach($exams as $exam)
                    @php $grade = $grades[$exam->id] ?? null; @endphp
                    <tr>
                        <td>{{ $exam->title }}</td>
                        <td>{{ $exam->subject->name ?? '' }}</td>
                        <td>{{ optional($exam->exam_date)->format('d/m/Y') }}</td>
                        <td>{{ $grade?->is_absent ? 'Absent(e)' : ($grade?->score !== null ? $grade->score.' / '.$exam->max_score : '—') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <footer class="small">Généré le {{ now()->format('d/m/Y H:i') }}</footer>
</body>
</html>

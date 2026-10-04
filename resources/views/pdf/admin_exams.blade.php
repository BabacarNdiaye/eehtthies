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
        .small { font-size:11px }
    </style>
</head>
<body>
    <header>
        <div class="small">{{ config('app.name') }}</div>
        <h1>Liste des notes{{ $schoolClass ? ' — ' . $schoolClass->name : '' }}</h1>
    </header>

    @if(empty($payload) || count($payload) === 0)
        <p>Aucune épreuve trouvée pour les filtres fournis.</p>
    @else
        @foreach($payload as $block)
            @php $exam = $block['exam']; $students = $block['students']; $grades = $block['grades']; @endphp
            <section style="page-break-inside: avoid; margin-bottom: 18px;">
                <h2>{{ $exam->title }} — {{ $exam->subject->name ?? '' }} ({{ ucfirst($exam->type) }})</h2>
                <div class="small">Date: {{ optional($exam->exam_date)->format('Y-m-d') }} · Classe: {{ $exam->schoolClass->name ?? '—' }}</div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Matricule</th>
                            <th>Élève</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($students as $i => $student)
                            @php $grade = $grades[$student->id] ?? null; @endphp
                            <tr>
                                <td>{{ $i + 1 }}</td>
                                <td>{{ $student->matricule ?? '' }}</td>
                                <td>{{ $student->first_name }} {{ $student->last_name }}</td>
                                <td>{{ ($grade && $grade->is_absent) ? (\App\Models\Grade::STATUSES[$grade->resolvedStatus()] ?? 'Absent(e)') : (($grade && $grade->score !== null) ? $grade->score : '—') }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4">Aucun élève dans cette classe.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </section>
        @endforeach
    @endif

    <footer class="small">Généré le {{ now()->format('Y-m-d H:i') }}</footer>
</body>
</html>
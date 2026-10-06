@extends('mail.layout')

@section('title', 'Notes à saisir — '.$exam->title)
@section('eyebrow', 'Pédagogie · Saisie des notes')

@section('content')
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #15263a;">
        Bonjour,<br><br>
        L'épreuve <strong>« {{ $exam->title }} »</strong>
        ({{ $exam->subject->name ?? '—' }} — {{ $exam->schoolClass->name ?? '—' }}),
        qui a eu lieu le {{ \Illuminate\Support\Carbon::parse($exam->exam_date)->translatedFormat('d/m/Y') }},
        n'a pas encore toutes ses notes saisies :
        <strong style="color:#b91c1c;">{{ $missingCount }} élève(s) sans note</strong>.
    </p>
    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #15263a;">
        Merci de compléter la saisie dès que possible afin que les bulletins puissent être générés à temps.
    </p>
@endsection

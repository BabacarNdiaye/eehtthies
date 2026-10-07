@extends('mail.layout')

@section('title', "Note d'information N° ".$note->reference)

@section('content')
    <p style="margin: 0 0 6px; font-size: 12px; color: #6c86a3; text-transform: uppercase; letter-spacing: 1px;">Note d'information N° {{ $note->reference }} — {{ $note->note_date->format('d/m/Y') }}</p>
    <h2 style="margin: 0 0 18px; font-size: 20px; color: #0b1728;">{{ $note->subject }}</h2>
    <div style="font-size: 15px; line-height: 1.7; color: #15263a; ">{!! $note->body_html !!}</div>
    <p style="margin: 24px 0 0; font-size: 13px; color: #6c86a3;">La note officielle est jointe à ce message au format PDF.</p>
    <p style="margin: 16px 0 0; font-size: 14px; font-style: italic; font-weight: bold; color: #15263a;">La Direction de l’EEHT de Thiès</p>
@endsection

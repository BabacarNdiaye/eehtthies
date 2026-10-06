@extends('mail.layout')

@section('title', $subject)

@section('content')
    @if($recipientName)
        <p style="margin: 0 0 16px; font-size: 15px; color: #15263a;">Bonjour {{ $recipientName }},</p>
    @endif
    <div style="font-size: 15px; line-height: 1.7; color: #15263a; white-space: pre-line;">{{ $body }}</div>
@endsection
